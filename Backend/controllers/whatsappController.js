const WhatsAppConfig = require('../models/WhatsAppConfig');
const WhatsAppPendingMessage = require('../models/WhatsAppPendingMessage');
const evolution = require('../services/whatsapp/evolutionClient');

const ensureSingleton = async () => {
    let cfg = await WhatsAppConfig.findOne({ singletonKey: 'main' });
    if (!cfg) cfg = await WhatsAppConfig.create({ singletonKey: 'main' });
    return cfg;
};

const normalizeGatewayState = (payload) => {
    const raw = payload?.state || payload?.status || payload?.connectionState || payload?.connectionStatus || payload?.instance?.state || '';
    const normalized = String(raw || '').trim().toLowerCase();

    if (['open', 'connected', 'online'].includes(normalized)) return 'open';
    if (['connecting', 'pairing', 'qr', 'pending_qr', 'pending'].includes(normalized)) return 'connecting';
    if (['close', 'closed', 'disconnected', 'logout', 'offline'].includes(normalized)) return 'close';
    return normalized;
};

const toDataUrl = (value = '') => {
    if (!value || typeof value !== 'string') return '';
    return value.startsWith('data:') ? value : `data:image/png;base64,${value}`;
};

const extractInlineQr = (payload) => {
    const qrCodeStr = typeof payload?.qrcode?.code === 'string' && payload.qrcode.code.startsWith('data:')
        ? payload.qrcode.code
        : '';

    const base64 =
        payload?.qrcode?.base64 ||
        payload?.base64 ||
        payload?.qr ||
        payload?.qrCode ||
        payload?.codeBase64 ||
        qrCodeStr ||
        (typeof payload?.qrcode === 'string' ? payload.qrcode : '') ||
        '';

    const code =
        payload?.qrcode?.code ||
        payload?.pairingCode ||
        payload?.code ||
        '';

    return { dataUrl: toDataUrl(base64), code: typeof code === 'string' ? code : '' };
};

const getGatewayErrorMessage = (err) => {
    const data = err?.response?.data;
    return data?.message || data?.msg || data?.error || err?.message || 'Unknown gateway error';
};

const QR_STUCK_THRESHOLD_MS = 45000;

const isStuckConnectingWithoutQr = (cfg, liveState) => {
    if (liveState !== 'connecting') return false;
    if (cfg?.lastQrBase64) return false;

    const lastAttemptAt = cfg?.lastQrFetchedAt ? new Date(cfg.lastQrFetchedAt).getTime() : 0;
    if (!lastAttemptAt) return true;

    return (Date.now() - lastAttemptAt) > QR_STUCK_THRESHOLD_MS;
};

const recreateGatewayInstance = async () => {
    await evolution.logout().catch(() => null);
    await evolution.deleteInstance().catch(() => null);
    return evolution.createInstance().catch((e) => ({
        __error: getGatewayErrorMessage(e),
        __status: e.response?.status || 0,
    }));
};

const requestGatewayQr = async (startingState = '') => {
    const created = await evolution.createInstance().catch((e) => {
        console.warn('whatsapp.createInstance warn:', e.response?.data || e.message);
        return { __error: getGatewayErrorMessage(e), __status: e.response?.status || 0 };
    });

    const createdQr = extractInlineQr(created);
    let dataUrl = createdQr.dataUrl;
    let code = createdQr.code;
    let qrState = startingState;
    let recoverableGatewayFailure = Number(created?.__status) >= 500;

    if (!dataUrl) {
        const qr = await evolution.getQRCode().catch((e) => ({
            base64: '',
            code: '',
            state: '',
            raw: e.response?.data || null,
            __error: getGatewayErrorMessage(e),
            __status: e.response?.status || 0,
        }));

        dataUrl = toDataUrl(qr.base64);
        code = qr.code || code;
        qrState = normalizeGatewayState(qr.raw) || normalizeGatewayState({ state: qr.state }) || qrState;
        recoverableGatewayFailure = recoverableGatewayFailure || Number(qr.__status) >= 500;

        if (!dataUrl && !code) {
            console.warn('whatsapp.connect: empty QR raw =', JSON.stringify(qr.raw)?.slice(0, 500));
        }
    }

    return { dataUrl, code, qrState, recoverableGatewayFailure };
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
    let cfg = null;
    try {
        if (!evolution.isConfigured()) {
            return res.status(400).json({
                msg: 'WhatsApp gateway is not configured. Add EVOLUTION_API_URL and EVOLUTION_API_KEY in backend secrets, then redeploy.',
            });
        }
        cfg = await ensureSingleton();
        cfg.instanceName = evolution.instanceName();

        let liveState = '';
        try {
            liveState = normalizeGatewayState(await evolution.getStatus());
        } catch {
            liveState = '';
        }

        if (liveState === 'open') {
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

        let autoRecovered = false;
        let recoveryMessage = '';
        let { dataUrl, code, qrState, recoverableGatewayFailure } = await requestGatewayQr(liveState);

        if (!dataUrl && !code && isStuckConnectingWithoutQr(cfg, qrState || liveState)) {
            console.warn('whatsapp.connect: instance stuck in connecting without QR, recreating gateway instance');
            await recreateGatewayInstance();
            ({ dataUrl, code, qrState, recoverableGatewayFailure } = await requestGatewayQr(''));
            autoRecovered = true;
            recoveryMessage = 'The previous link session was stuck, so a fresh WhatsApp session was started automatically.';
        }

        cfg.status = qrState === 'open' ? 'connected' : (qrState === 'connecting' ? 'connecting' : 'pending_qr');
        cfg.lastQrBase64 = dataUrl || cfg.lastQrBase64 || '';
        cfg.lastQrFetchedAt = new Date();
        cfg.lastSeen = new Date();
        cfg.lastError = '';
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
                fallback: true,
                retryable: true,
                msg: 'Showing the last available QR while the gateway refreshes a new one.',
            });
        }

        if (!dataUrl && !code) {
            return res.json({
                status: cfg.status,
                qrBase64: '',
                code: '',
                fallback: true,
                retryable: true,
                recovered: autoRecovered,
                gatewayState: qrState || 'unknown',
                msg: autoRecovered
                    ? `${recoveryMessage} If the QR still does not appear within a few seconds, the gateway itself is not producing one yet.`
                    : (recoverableGatewayFailure
                        ? 'WhatsApp gateway is still preparing the QR. Keep this window open and retry in a few seconds.'
                        : 'QR is not ready yet. Keep this window open and retry in a few seconds.'),
            });
        }

        res.json({ status: cfg.status, qrBase64: dataUrl, code, fallback: false, recovered: autoRecovered, msg: recoveryMessage });
    } catch (err) {
        const msg = getGatewayErrorMessage(err);
        const gatewayStatus = Number(err?.response?.status || 0);
        const fallback = gatewayStatus >= 500;

        if (cfg) {
            cfg.status = fallback ? 'pending_qr' : 'error';
            cfg.lastError = fallback ? '' : String(msg).slice(0, 500);
            cfg.lastSeen = new Date();
            await cfg.save().catch(() => null);
        } else {
            await WhatsAppConfig.updateOne(
                { singletonKey: 'main' },
                { $set: { status: fallback ? 'pending_qr' : 'error', lastError: fallback ? '' : String(msg).slice(0, 500) } }
            ).catch(() => null);
        }

        console.error('whatsapp.connect:', msg);

        if (fallback) {
            return res.json({
                status: 'pending_qr',
                qrBase64: '',
                code: '',
                fallback: true,
                retryable: true,
                msg: 'WhatsApp gateway is temporarily unavailable, but the link session is still active. Retry in a few seconds.',
            });
        }

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

// POST /api/whatsapp/reset — admin: hard-reset the gateway instance.
// Only allowed when not currently linked, to avoid blowing away a healthy session.
exports.reset = async (req, res) => {
    try {
        if (!evolution.isConfigured()) {
            return res.status(400).json({ msg: 'WhatsApp gateway is not configured.' });
        }

        const cfg = await ensureSingleton();

        // Refuse if currently connected — caller should use Disconnect instead.
        let liveState = '';
        try { liveState = normalizeGatewayState(await evolution.getStatus()); } catch { liveState = ''; }
        if (liveState === 'open' || cfg.status === 'connected') {
            return res.status(409).json({
                msg: 'WhatsApp is currently linked. Disconnect first before resetting the instance.',
            });
        }

        // Best-effort: log out any half-open session, then delete the instance.
        await evolution.logout().catch(() => null);
        const deleted = await evolution.deleteInstance().catch((e) => ({ error: e.message }));

        // Reset the singleton so the next connect starts from a clean slate.
        cfg.status = 'disconnected';
        cfg.linkedNumber = '';
        cfg.linkedAt = null;
        cfg.lastQrBase64 = '';
        cfg.lastQrFetchedAt = null;
        cfg.lastError = '';
        cfg.lastSeen = new Date();
        await cfg.save();

        // Recreate immediately so the next "Link WhatsApp" can return a fresh QR.
        const created = await evolution.createInstance().catch((e) => ({ error: e.message }));

        return res.json({
            msg: 'WhatsApp instance reset. Click "Link WhatsApp" to scan a new QR.',
            deleted,
            created,
        });
    } catch (err) {
        console.error('whatsapp.reset:', err.message);
        return res.status(500).json({ msg: 'Failed to reset WhatsApp instance: ' + err.message });
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
