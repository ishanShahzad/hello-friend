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
// Evolution API v2.x: QR is NOT generated on instance creation - must call /instance/connect after
exports.createInstance = async () => {
    if (!isConfigured()) throw new Error('Evolution API not configured');
    try {
        const { data } = await client().post('/instance/create', {
            instanceName: instanceName(),
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
        });
        console.log('Evolution instance created:', JSON.stringify(data).slice(0, 300));
        return data;
    } catch (err) {
        // Already exists — not fatal
        const msg = err.response?.data?.message?.toString() || err.response?.data?.response?.message?.toString() || '';
        if (err.response?.status === 403 || err.response?.status === 409 || msg.toLowerCase().includes('already')) {
            console.log('Evolution instance already exists');
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

const readStateValue = (...values) => {
    for (const value of values) {
        if (typeof value === 'string' && value.trim()) return value;
        if (value && typeof value === 'object') {
            if (typeof value.state === 'string' && value.state.trim()) return value.state;
            if (typeof value.status === 'string' && value.status.trim()) return value.status;
            if (typeof value.connectionState === 'string' && value.connectionState.trim()) return value.connectionState;
        }
    }
    return '';
};

const extractState = (data) => {
    const src = pickInstancePayload(data) || data || {};
    return readStateValue(
        src?.state,
        src?.status,
        src?.connectionStatus,
        src?.connectionState,
        src?.instance,
        src?.instance?.connectionStatus,
        data?.instance,
    );
};

const extractQr = (data) => {
    if (!data) return { base64: '', code: '' };

    const src = pickInstancePayload(data) || data || {};
    
    // Evolution API v2.x response format investigation
    // Log the structure to understand what we're getting
    if (src && typeof src === 'object') {
        const keys = Object.keys(src).slice(0, 20);
        console.log('QR data keys:', keys.join(', '));
        if (src.qrcode) console.log('qrcode object:', JSON.stringify(src.qrcode).slice(0, 200));
    }
    
    // Evolution API v2.x stores QR in various possible locations
    const qrcodeObj = src?.qrcode || src?.qr || {};
    
    // Try to extract base64 QR image from multiple possible locations
    const qrCodeStr = typeof qrcodeObj?.code === 'string' && qrcodeObj.code.startsWith('data:')
        ? qrcodeObj.code
        : '';
    const qrOrCodeStr = typeof src?.qrOrCode === 'string' ? src.qrOrCode : '';
    const qrOrCodeIsDataUrl = qrOrCodeStr.startsWith('data:');
    const pairCodeStr = typeof src?.pairingCode === 'string' ? src.pairingCode : 
                        typeof qrcodeObj?.pairingCode === 'string' ? qrcodeObj.pairingCode : '';

    const b64 =
        qrcodeObj?.base64 ||
        src?.base64 ||
        src?.qrBase64 ||
        (qrOrCodeIsDataUrl ? qrOrCodeStr : '') ||
        qrCodeStr ||
        src?.qr?.base64 ||
        src?.qrCode ||
        src?.codeBase64 ||
        (typeof qrcodeObj === 'string' && qrcodeObj.startsWith('data:') ? qrcodeObj : '') ||
        '';
    
    const code =
        pairCodeStr ||
        src?.code ||
        qrcodeObj?.code ||
        (typeof qrcodeObj?.code === 'string' && !qrcodeObj.code.startsWith('data:') ? qrcodeObj.code : '') ||
        (!qrOrCodeIsDataUrl ? qrOrCodeStr : '') ||
        '';

    console.log(`Extracted QR: hasBase64=${!!b64}, hasCode=${!!code}, base64Length=${b64.length}, code=${code}`);
    return { base64: b64 || '', code: code || '' };
};

// Returns { base64, code } — base64 is a PNG data URL we render in the admin modal.
// Polls Evolution up to ~15s because the QR isn't always ready on the first request.
// Evolution API v2.x requires using /instance/connect endpoint to trigger QR generation.
exports.getQRCode = async () => {
    if (!isConfigured()) throw new Error('Evolution API not configured');
    let lastRaw = null;

    // Evolution API v2.x: Must call /instance/connect to trigger QR generation
    // This is different from v1.x which auto-generated QR on instance creation
    try {
        // Use POST to /instance/connect to trigger QR generation
        const { data } = await client().post(`/instance/connect/${instanceName()}`, {});
        lastRaw = data;
        console.log('Evolution connect response:', JSON.stringify(data).slice(0, 500));
    } catch (err) {
        // If POST fails, the endpoint might not exist in this version
        console.warn('Evolution connect POST failed:', err.response?.status, err.response?.data?.message || err.message);
        lastRaw = err.response?.data || { error: err.message };
    }

    // Wait a moment for QR to be generated
    await new Promise(r => setTimeout(r, 2000));

    for (let attempt = 0; attempt < 12; attempt++) {
        try {
            // Primary method: fetch all instances and find ours
            const { data: instances } = await client().get('/instance/fetchInstances');
            lastRaw = instances;
            
            const ourInstance = Array.isArray(instances) 
                ? instances.find(i => (i.instanceName || i.name) === instanceName())
                : instances;
            
            if (ourInstance) {
                const { base64, code } = extractQr(ourInstance);
                const state = extractState(ourInstance);
                
                console.log(`QR attempt ${attempt + 1}: state=${state}, hasBase64=${!!base64}, hasCode=${!!code}`);
                
                if (base64 || code) {
                    return { base64, code, state, raw: ourInstance };
                }
                
                if (state === 'open') {
                    return { base64: '', code: '', state, raw: ourInstance };
                }
            }
        } catch (err) {
            lastRaw = err.response?.data || { error: err.message };
        }

        // Check if already connected
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

// Hard-delete the instance so it can be recreated cleanly.
// Used by the admin "Reset instance" action when the QR flow is stuck.
exports.deleteInstance = async () => {
    if (!isConfigured()) return { msg: 'not_configured' };
    try {
        const { data } = await client().delete(`/instance/delete/${instanceName()}`);
        return data;
    } catch (err) {
        return { error: err.response?.data || err.message };
    }
};

// Restart instance to trigger QR generation (Evolution API v2.x)
exports.restartInstance = async () => {
    if (!isConfigured()) return { msg: 'not_configured' };
    try {
        const { data } = await client().put(`/instance/restart/${instanceName()}`);
        return data;
    } catch (err) {
        return { error: err.response?.data || err.message };
    }
};

// Trigger QR generation by connecting instance (Evolution API v2.x)
exports.connectInstance = async () => {
    if (!isConfigured()) return { msg: 'not_configured' };
    try {
        // Try POST first (some versions use POST)
        const { data } = await client().post(`/instance/connect/${instanceName()}`, {});
        console.log('Evolution connect (POST) response:', JSON.stringify(data).slice(0, 300));
        return data;
    } catch (err) {
        // If POST fails with 404, try GET
        if (err.response?.status === 404) {
            try {
                const { data } = await client().get(`/instance/connect/${instanceName()}`);
                console.log('Evolution connect (GET) response:', JSON.stringify(data).slice(0, 300));
                return data;
            } catch (getErr) {
                return { error: getErr.response?.data || getErr.message };
            }
        }
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
