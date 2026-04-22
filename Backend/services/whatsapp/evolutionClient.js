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

const extractQr = (data) => {
    if (!data) return { base64: '', code: '' };
    // Evolution returns several shapes across versions:
    //  - { base64, code }
    //  - { qrcode: { base64, code } }
    //  - { instance: { ... }, qrcode: { base64, code } }
    //  - { qr: 'data:image/png;base64,...' }
    const b64 =
        data?.base64 ||
        data?.qrcode?.base64 ||
        data?.qrcode?.code?.startsWith?.('data:') ? data?.qrcode?.code : null ||
        data?.qr ||
        (typeof data?.qrcode === 'string' ? data.qrcode : '') ||
        '';
    const code = data?.code || data?.qrcode?.code || '';
    return { base64: b64 || '', code: code || '' };
};

// Returns { base64, code } — base64 is a PNG data URL we render in the admin modal.
// Polls Evolution up to ~6s because the QR isn't always ready on the first request.
exports.getQRCode = async () => {
    if (!isConfigured()) throw new Error('Evolution API not configured');
    let lastRaw = null;
    for (let attempt = 0; attempt < 4; attempt++) {
        try {
            const { data } = await client().get(`/instance/connect/${instanceName()}`);
            lastRaw = data;
            const { base64, code } = extractQr(data);
            if (base64 || code) return { base64, code, raw: data };
        } catch (err) {
            lastRaw = err.response?.data || { error: err.message };
        }
        await new Promise(r => setTimeout(r, 1500));
    }
    return { base64: '', code: '', raw: lastRaw };
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
