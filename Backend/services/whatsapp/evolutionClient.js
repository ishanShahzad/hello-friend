// Thin wrapper around Evolution API REST endpoints.
// Docs: https://doc.evolution-api.com/

const axios = require('axios');

const baseUrl = () => (process.env.EVOLUTION_API_URL || '').replace(/\/+$/, '');
const apiKey = () => process.env.EVOLUTION_API_KEY || '';
const instanceName = () => process.env.EVOLUTION_INSTANCE_NAME || 'rozare-main';

const isConfigured = () => Boolean(baseUrl() && apiKey());

const client = () => axios.create({
    baseURL: baseUrl(),
    timeout: 20000,
    headers: { apikey: apiKey(), 'Content-Type': 'application/json' },
});

// Create or fetch the WhatsApp instance (idempotent on most Evolution builds)
// Returns the create response — which on fresh installs already includes the QR.
exports.createInstance = async () => {
    if (!isConfigured()) throw new Error('Evolution API not configured');
    try {
        const { data } = await client().post('/instance/create', {
            instanceName: instanceName(),
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
        });
        return data;
    } catch (err) {
        // Already exists — not fatal
        const msg = err.response?.data?.message?.toString() || err.response?.data?.response?.message?.toString() || '';
        if (err.response?.status === 403 || err.response?.status === 409 || msg.toLowerCase().includes('already')) {
            return { msg: 'instance_exists' };
        }
        throw err;
    }
};

const pickInstancePayload = (data) => {
    if (!data) return null;
    if (Array.isArray(data)) {
        return data.find((item) => {
            const name = item?.instanceName || item?.name || item?.instance?.instanceName || item?.instance?.name;
            return name === instanceName();
        }) || data[0] || null;
    }

    if (Array.isArray(data?.instances)) return pickInstancePayload(data.instances);
    if (Array.isArray(data?.data)) return pickInstancePayload(data.data);

    return data?.instance || data;
};

const extractState = (data) => {
    const src = pickInstancePayload(data) || data || {};
    return src?.state || src?.status || src?.connectionStatus || src?.connectionState || '';
};

const extractQr = (data) => {
    if (!data) return { base64: '', code: '' };

    const src = pickInstancePayload(data) || data || {};
    const qrCodeStr = typeof src?.qrcode?.code === 'string' && src.qrcode.code.startsWith('data:')
        ? src.qrcode.code
        : '';
    const pairCodeStr = typeof src?.pairingCode === 'string' ? src.pairingCode : '';

    const b64 =
        src?.base64 ||
        src?.qrcode?.base64 ||
        qrCodeStr ||
        src?.qr ||
        src?.qrCode ||
        src?.codeBase64 ||
        (typeof src?.qrcode === 'string' ? src.qrcode : '') ||
        '';
    const code =
        src?.code ||
        (typeof src?.qrcode?.code === 'string' ? src.qrcode.code : '') ||
        pairCodeStr ||
        '';

    return { base64: b64 || '', code: code || '' };
};

// Returns { base64, code } — base64 is a PNG data URL we render in the admin modal.
// Polls Evolution up to ~6s because the QR isn't always ready on the first request.
exports.getQRCode = async () => {
    if (!isConfigured()) throw new Error('Evolution API not configured');
    let lastRaw = null;
    const requesters = [
        () => client().get(`/instance/connect/${instanceName()}`),
        () => client().post(`/instance/connect/${instanceName()}`, {}),
        () => client().get(`/instance/connectionState/${instanceName()}`),
        () => client().get('/instance/fetchInstances'),
    ];

    for (let attempt = 0; attempt < 8; attempt++) {
        for (const request of requesters) {
            try {
                const { data } = await request();
                lastRaw = data;
                const { base64, code } = extractQr(data);
                if (base64 || code) {
                    return { base64, code, state: extractState(data), raw: data };
                }
            } catch (err) {
                lastRaw = err.response?.data || { error: err.message };
            }
        }

        const state = extractState(lastRaw);
        if (state === 'open') {
            return { base64: '', code: '', state, raw: lastRaw };
        }

        await new Promise(r => setTimeout(r, 1500));
    }

    return { base64: '', code: '', state: extractState(lastRaw), raw: lastRaw };
};

exports.getStatus = async () => {
    if (!isConfigured()) return { state: 'not_configured' };
    try {
        const { data } = await client().get(`/instance/connectionState/${instanceName()}`);
        // Returns { instance: { state: 'open' | 'connecting' | 'close' } }
        return data?.instance || data || {};
    } catch (err) {
        return { state: 'error', error: err.response?.data || err.message };
    }
};

exports.logout = async () => {
    if (!isConfigured()) return { msg: 'not_configured' };
    try {
        const { data } = await client().delete(`/instance/logout/${instanceName()}`);
        return data;
    } catch (err) {
        return { error: err.response?.data || err.message };
    }
};

// Send a plain text message — `number` is digits only (e.g., 9230012345678)
exports.sendText = async (number, text) => {
    if (!isConfigured()) throw new Error('Evolution API not configured');
    const { data } = await client().post(`/message/sendText/${instanceName()}`, {
        number,
        text,
        delay: 0,
    });
    // Common shapes: { key: { id }, message } or { messageId }
    const messageId = data?.key?.id || data?.messageId || data?.id || '';
    return { messageId, raw: data };
};

// Send a poll — Evolution path: /message/sendPoll/{instance}
exports.sendPoll = async (number, { name, values, selectableCount = 1 }) => {
    if (!isConfigured()) throw new Error('Evolution API not configured');
    const { data } = await client().post(`/message/sendPoll/${instanceName()}`, {
        number,
        name,
        selectableCount,
        values,
        delay: 0,
    });
    const messageId = data?.key?.id || data?.messageId || data?.id || '';
    return { messageId, raw: data };
};

// Register webhook URL with Evolution so vote events flow back
exports.setWebhook = async (url, secret = '') => {
    if (!isConfigured()) throw new Error('Evolution API not configured');
    const { data } = await client().post(`/webhook/set/${instanceName()}`, {
        url,
        webhook_by_events: false,
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
        ...(secret ? { headers: { 'x-rozare-webhook-secret': secret } } : {}),
    });
    return data;
};

exports.isConfigured = isConfigured;
exports.instanceName = instanceName;
