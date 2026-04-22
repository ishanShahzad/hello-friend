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
            try { liveState = await evolution.getStatus(); } catch (_) { liveState = null; }
        }

        // Reconcile DB with live Evolution status
        if (liveState?.state === 'open' && cfg.status !== 'connected') {
            cfg.status = 'connected';
            cfg.linkedAt = cfg.linkedAt || new Date();
            cfg.lastSeen = new Date();
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

        await evolution.createInstance().catch(() => null); // idempotent
        const qr = await evolution.getQRCode();

        const base64 = qr.base64?.startsWith('data:')
            ? qr.base64
            : qr.base64 ? `data:image/png;base64,${qr.base64}` : '';

        cfg.status = 'pending_qr';
        cfg.lastQrBase64 = base64;
        cfg.lastQrFetchedAt = new Date();
        cfg.lastError = '';
        await cfg.save();

        res.json({ status: cfg.status, qrBase64: base64, code: qr.code || '' });
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

// Public webhook receiver (signed via header)
exports.webhook = require('../services/whatsapp/webhookHandler').handleEvolutionWebhook;
