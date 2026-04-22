const WhatsAppConfig = require('../models/WhatsAppConfig');
const WhatsAppPendingMessage = require('../models/WhatsAppPendingMessage');
const evolution = require('../services/whatsapp/evolutionClient');

const ensureSingleton = async () => {
    let cfg = await WhatsAppConfig.findOne({ singletonKey: 'main' });
    if (!cfg) cfg = await WhatsAppConfig.create({ singletonKey: 'main' });
    return cfg;
};

// GET /api/whatsapp/status — admin
exports.getStatus = async (req, res) => {
    try {
        const cfg = await ensureSingleton();

        let liveState = null;
        if (evolution.isConfigured()) {
            try { liveState = await evolution.getStatus(); } catch { liveState = null; }
        }

        // Reconcile DB with live Evolution status
        if (liveState?.state === 'open' && cfg.status !== 'connected') {
            cfg.status = 'connected';
            cfg.linkedAt = cfg.linkedAt || new Date();
            cfg.lastSeen = new Date();
            cfg.lastError = '';
            await cfg.save();
        } else if (liveState?.state === 'close' && cfg.status === 'connected') {
            cfg.status = 'disconnected';
            await cfg.save();
        }

        res.json({
            configured: evolution.isConfigured(),
            status: cfg.status,
            linkedNumber: cfg.linkedNumber,
            linkedAt: cfg.linkedAt,
            lastSeen: cfg.lastSeen,
            instanceName: cfg.instanceName || evolution.instanceName(),
            sentInLastHour: cfg.sentInLastHour,
            lastError: cfg.lastError,
            qrBase64: cfg.lastQrBase64 || '',
            liveState: liveState?.state || null,
        });
    } catch (err) {
        console.error('whatsapp.getStatus:', err.message);
        res.status(500).json({ msg: 'Failed to fetch WhatsApp status' });
    }
};

// POST /api/whatsapp/connect — admin: ensure instance + return QR
exports.connect = async (req, res) => {
    try {
        if (!evolution.isConfigured()) {
            return res.status(400).json({
                msg: 'WhatsApp gateway is not configured. Add EVOLUTION_API_URL and EVOLUTION_API_KEY in backend secrets, then redeploy.',
            });
        }
        const cfg = await ensureSingleton();
        cfg.instanceName = evolution.instanceName();

        let liveState = null;
        try {
            liveState = await evolution.getStatus();
        } catch {
            liveState = null;
        }

        if (liveState?.state === 'open') {
            cfg.status = 'connected';
            cfg.linkedAt = cfg.linkedAt || new Date();
            cfg.lastSeen = new Date();
            cfg.lastError = '';
            await cfg.save();
            return res.json({
                status: cfg.status,
                qrBase64: '',
                code: '',
                msg: 'WhatsApp is already linked.',
                alreadyLinked: true,
            });
        }

        // createInstance often returns the QR directly on a fresh install
        const created = await evolution.createInstance().catch((e) => {
            console.warn('whatsapp.createInstance warn:', e.response?.data || e.message);
            return null;
        });

        let base64 = '';
        let code = '';
        if (created && (created.qrcode || created.base64 || created.qr)) {
            const b = created.qrcode?.base64 || created.base64 || created.qr || '';
            base64 = b;
            code = created.qrcode?.code || created.code || '';
        }

        // Fallback / refresh via connect endpoint (with internal polling)
        let qrState = liveState?.state || '';
        if (!base64) {
            const qr = await evolution.getQRCode();
            base64 = qr.base64;
            code = qr.code;
            qrState = qr.state || qrState;
            if (!base64 && !code) {
                console.warn('whatsapp.connect: empty QR raw =', JSON.stringify(qr.raw)?.slice(0, 500));
            }
        }

        const dataUrl = base64
            ? (base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`)
            : '';

        cfg.status = qrState === 'open' ? 'connected' : (qrState === 'connecting' ? 'connecting' : 'pending_qr');
        cfg.lastQrBase64 = dataUrl || cfg.lastQrBase64 || '';
        cfg.lastQrFetchedAt = new Date();
        cfg.lastSeen = new Date();
        cfg.lastError = dataUrl || code || qrState === 'open'
            ? ''
            : 'Gateway returned no QR. Check EVOLUTION_API_URL is reachable and the instance is not already linked.';
        await cfg.save();

        if (cfg.status === 'connected') {
            return res.json({
                status: cfg.status,
                qrBase64: '',
                code: '',
                msg: 'WhatsApp linked successfully.',
                alreadyLinked: true,
            });
        }

        if (!dataUrl && !code && cfg.lastQrBase64) {
            return res.json({
                status: cfg.status,
                qrBase64: cfg.lastQrBase64,
                code: '',
                cached: true,
            });
        }

        if (!dataUrl && !code) {
            return res.status(502).json({
                msg: cfg.lastError,
                qrBase64: '',
                code: '',
            });
        }

        res.json({ status: cfg.status, qrBase64: dataUrl, code });
    } catch (err) {
        const msg = err.response?.data?.message || err.message;
        await WhatsAppConfig.updateOne(
            { singletonKey: 'main' },
            { $set: { status: 'error', lastError: String(msg).slice(0, 500) } }
        );
        console.error('whatsapp.connect:', msg);
        res.status(500).json({ msg: 'Failed to start WhatsApp connection: ' + msg });
    }
};

// POST /api/whatsapp/disconnect — admin
exports.disconnect = async (req, res) => {
    try {
        await evolution.logout().catch(() => null);
        await WhatsAppConfig.updateOne(
            { singletonKey: 'main' },
            {
                $set: {
                    status: 'disconnected',
                    linkedNumber: '',
                    linkedAt: null,
                    lastQrBase64: '',
                },
            }
        );
        res.json({ msg: 'Disconnected' });
    } catch (err) {
        console.error('whatsapp.disconnect:', err.message);
        res.status(500).json({ msg: 'Failed to disconnect' });
    }
};

// GET /api/whatsapp/queue — admin: recent activity
exports.getQueue = async (req, res) => {
    try {
        const items = await WhatsAppPendingMessage.find()
            .sort({ updatedAt: -1 })
            .limit(20)
            .select('orderId phone status attempts lastError sentAt repliedAt createdAt updatedAt');

        // Mask middle digits of phone
        const masked = items.map(it => {
            const obj = it.toObject();
            const p = obj.phone || '';
            obj.phone = p.length > 6 ? `${p.slice(0, 3)}••••${p.slice(-3)}` : p;
            return obj;
        });
        res.json({ items: masked });
    } catch (err) {
        console.error('whatsapp.getQueue:', err.message);
        res.status(500).json({ msg: 'Failed to fetch queue' });
    }
};

// GET /api/whatsapp/stats — admin: aggregate analytics
exports.getStats = async (req, res) => {
    try {
        const now = new Date();
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [byStatus, last24h, last7d, total, recentSeries, avgResponse] = await Promise.all([
            WhatsAppPendingMessage.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
            WhatsAppPendingMessage.countDocuments({ createdAt: { $gte: dayAgo } }),
            WhatsAppPendingMessage.countDocuments({ createdAt: { $gte: weekAgo } }),
            WhatsAppPendingMessage.countDocuments({}),
            WhatsAppPendingMessage.aggregate([
                { $match: { createdAt: { $gte: weekAgo } } },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        sent: { $sum: { $cond: [{ $in: ['$status', ['sent', 'voted_yes', 'voted_no']] }, 1, 0] } },
                        confirmed: { $sum: { $cond: [{ $eq: ['$status', 'voted_yes'] }, 1, 0] } },
                        declined: { $sum: { $cond: [{ $eq: ['$status', 'voted_no'] }, 1, 0] } },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
            WhatsAppPendingMessage.aggregate([
                { $match: { repliedAt: { $ne: null }, sentAt: { $ne: null } } },
                {
                    $project: {
                        responseMs: { $subtract: ['$repliedAt', '$sentAt'] },
                    },
                },
                { $group: { _id: null, avg: { $avg: '$responseMs' } } },
            ]),
        ]);

        const counts = byStatus.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {});
        const sent = (counts.sent || 0) + (counts.voted_yes || 0) + (counts.voted_no || 0);
        const confirmed = counts.voted_yes || 0;
        const declined = counts.voted_no || 0;
        const failed = counts.failed || 0;
        const queued = counts.queued || 0;
        const expired = counts.expired || 0;
        const replied = confirmed + declined;
        const responseRate = sent > 0 ? Math.round((replied / sent) * 100) : 0;
        const confirmationRate = replied > 0 ? Math.round((confirmed / replied) * 100) : 0;
        const avgResponseMinutes = avgResponse[0]?.avg ? Math.round(avgResponse[0].avg / 60000) : null;

        res.json({
            total,
            last24h,
            last7d,
            sent,
            confirmed,
            declined,
            failed,
            queued,
            expired,
            responseRate,
            confirmationRate,
            avgResponseMinutes,
            timeline: recentSeries.map(d => ({ date: d._id, sent: d.sent, confirmed: d.confirmed, declined: d.declined })),
        });
    } catch (err) {
        console.error('whatsapp.getStats:', err.message);
        res.status(500).json({ msg: 'Failed to fetch WhatsApp stats' });
    }
};

// Public webhook receiver (signed via header)
exports.webhook = require('../services/whatsapp/webhookHandler').handleEvolutionWebhook;
