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
        const keys = Object.keys(src).slice(0, 25);
        console.log('QR data keys:', keys.join(', '));
        if (src.qrcode) console.log('qrcode object:', JSON.stringify(src.qrcode).slice(0, 300));
        if (src.pairingCode) console.log('pairingCode found:', src.pairingCode);
        if (src.code) console.log('code found:', src.code);
    }
    
    // Evolution API v2.x stores QR/pairing code in various possible locations
    const qrcodeObj = src?.qrcode || src?.qr || {};
    
    // Try to extract pairing code first (more reliable in v2.x)
    const pairCodeStr = 
        src?.pairingCode ||
        qrcodeObj?.pairingCode ||
        src?.code ||
        qrcodeObj?.code ||
        '';
    
    // Try to extract base64 QR image from multiple possible locations
    const qrCodeStr = typeof qrcodeObj?.code === 'string' && qrcodeObj.code.startsWith('data:')
        ? qrcodeObj.code
        : '';
    const qrOrCodeStr = typeof src?.qrOrCode === 'string' ? src.qrOrCode : '';
    const qrOrCodeIsDataUrl = qrOrCodeStr.startsWith('data:');

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
    
    // Only use pairingCode if it's NOT a data URL (data URLs are QR codes)
    const code = (typeof pairCodeStr === 'string' && !pairCodeStr.startsWith('data:')) ? pairCodeStr : '';

    console.log(`Extracted QR: hasBase64=${!!b64}, hasCode=${!!code}, base64Length=${b64.length}, code=${code}`);
    return { base64: b64 || '', code: code || '' };
};

// Returns { base64, code } — base64 is a PNG data URL we render in the admin modal.
// Polls Evolution up to ~15s because the QR isn't always ready on the first request.
// Evolution API v2.x requires calling /instance/connect to start the connection and generate QR.
exports.getQRCode = async () => {
    if (!isConfigured()) throw new Error('Evolution API not configured');
    let lastRaw = null;

    // Evolution API v2.x: Must call /instance/connect to START the WhatsApp connection
    // This triggers the QR generation process
    try {
        const connectResult = await exports.connectInstance();
        console.log('Connect result:', JSON.stringify(connectResult).slice(0, 300));
        
        // Check if QR is immediately available in connect response
        const { base64: connectBase64, code: connectCode } = extractQr(connectResult);
        if (connectBase64 || connectCode) {
            return { 
                base64: connectBase64, 
                code: connectCode, 
                state: extractState(connectResult), 
                raw: connectResult 
            };
        }
    } catch (err) {
        console.warn('Evolution connect error:', err.message);
    }

    // Wait a moment for QR to be generated after connection starts
    await new Promise(r => setTimeout(r, 3000));

    for (let attempt = 0; attempt < 15; attempt++) {
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
                
                console.log(`QR attempt ${attempt + 1}: state=${state}, hasBase64=${!!base64}, hasCode=${!!code}, connectionStatus=${ourInstance.connectionStatus}`);
                
                // If we have QR or pairing code, return it
                if (base64 || code) {
                    return { base64, code, state, raw: ourInstance };
                }
                
                // If already connected, no QR needed
                if (state === 'open') {
                    return { base64: '', code: '', state, raw: ourInstance };
                }
                
                // If state is 'connecting', keep polling - QR might appear soon
                if (state === 'connecting' && attempt < 10) {
                    await new Promise(r => setTimeout(r, 2000));
                    continue;
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
// This actually starts the WhatsApp connection process
exports.connectInstance = async () => {
    if (!isConfigured()) return { msg: 'not_configured' };
    try {
        // Evolution API v2.x: Use GET /instance/connect/{instance} to start connection
        const { data } = await client().get(`/instance/connect/${instanceName()}`);
        console.log('Evolution connect response:', JSON.stringify(data).slice(0, 300));
        return data;
    } catch (err) {
        console.warn('Evolution connect failed:', err.response?.status, err.response?.data?.message || err.message);
        return { error: err.response?.data || err.message };
    }
};

// Request pairing code instead of QR (Evolution API v2.x)
// More reliable than QR for some WhatsApp versions
exports.requestPairingCode = async (phoneNumber) => {
    if (!isConfigured()) throw new Error('Evolution API not configured');
    try {
        // Phone number should be in format: 1234567890 (no + or country code prefix in some versions)
        const { data } = await client().post(`/instance/connectionState/${instanceName()}`, {
            state: 'open',
            number: phoneNumber,
        });
        console.log('Evolution pairing code response:', JSON.stringify(data).slice(0, 300));
        return data;
    } catch (err) {
        console.error('Evolution pairing code failed:', err.response?.data || err.message);
        throw err;
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
