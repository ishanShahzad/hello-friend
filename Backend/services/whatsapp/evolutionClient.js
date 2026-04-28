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
    
    // Evolution API v2.x response format - log everything to debug
    if (src && typeof src === 'object') {
        const keys = Object.keys(src).slice(0, 30);
        console.log('QR data keys:', keys.join(', '));
        
        // Log specific fields that might contain QR
        if (src.qrcode) console.log('qrcode field type:', typeof src.qrcode, 'value:', JSON.stringify(src.qrcode).slice(0, 100));
        if (src.pairingCode) console.log('pairingCode:', src.pairingCode);
        if (src.code) console.log('code:', src.code);
        if (src.base64) console.log('base64 length:', src.base64?.length);
    }
    
    // Evolution API v2.x stores QR/pairing code in various formats
    // Try to extract pairing code first (8-digit code)
    const pairCodeStr = 
        src?.pairingCode ||
        src?.qrcode?.pairingCode ||
        (typeof src?.code === 'string' && src.code.length < 20 ? src.code : '') ||
        '';
    
    // Try to extract base64 QR image
    // Evolution API v2.x might store it as:
    // - qrcode.base64
    // - qrcode (direct string)
    // - base64
    const qrcodeField = src?.qrcode;
    let b64 = '';
    
    if (typeof qrcodeField === 'string') {
        // qrcode is a direct base64 string
        b64 = qrcodeField.startsWith('data:') ? qrcodeField : `data:image/png;base64,${qrcodeField}`;
    } else if (qrcodeField && typeof qrcodeField === 'object') {
        // qrcode is an object with base64 field
        b64 = qrcodeField.base64 || qrcodeField.code || '';
        if (b64 && !b64.startsWith('data:')) {
            b64 = `data:image/png;base64,${b64}`;
        }
    }
    
    // Fallback to other possible locations
    if (!b64) {
        b64 = src?.base64 || src?.qrBase64 || src?.qrCode || '';
        if (b64 && !b64.startsWith('data:')) {
            b64 = `data:image/png;base64,${b64}`;
        }
    }
    
    // Only use pairingCode if it's NOT a data URL (data URLs are QR codes)
    const code = (typeof pairCodeStr === 'string' && !pairCodeStr.startsWith('data:')) ? pairCodeStr : '';

    console.log(`Extracted QR: hasBase64=${!!b64}, hasCode=${!!code}, base64Length=${b64.length}, code=${code}`);
    return { base64: b64 || '', code: code || '' };
};

// Returns { base64, code } — base64 is a PNG data URL we render in the admin modal.
// Evolution API v2.x requires explicit /instance/connect call to start WhatsApp connection
exports.getQRCode = async () => {
    if (!isConfigured()) throw new Error('Evolution API not configured');
    
    // Evolution API v2.x: Must call /instance/connect to trigger QR generation
    // First, try to connect the instance
    try {
        console.log('Triggering instance connection...');
        const connectResult = await client().get(`/instance/connect/${instanceName()}`);
        console.log('Connect result:', JSON.stringify(connectResult.data).slice(0, 300));
        
        // Check if QR is in the connect response
        const { base64: connectBase64, code: connectCode } = extractQr(connectResult.data);
        if (connectBase64 || connectCode) {
            console.log('QR found in connect response');
            return { base64: connectBase64, code: connectCode, state: 'connecting', raw: connectResult.data };
        }
    } catch (err) {
        console.warn('Connect call failed:', err.response?.status, err.message);
    }
    
    // Poll for QR code in instance data
    for (let attempt = 0; attempt < 15; attempt++) {
        try {
            const { data: instances } = await client().get('/instance/fetchInstances');
            
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
                
                // If state is 'connecting', QR should appear soon - keep polling
                if (state === 'connecting' && attempt < 10) {
                    await new Promise(r => setTimeout(r, 1500));
                    continue;
                }
            }
        } catch (err) {
            console.error('Error fetching instances:', err.message);
        }

        await new Promise(r => setTimeout(r, 1000));
    }

    // If we get here, QR was never generated
    return { base64: '', code: '', state: 'close', raw: null };
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
        // Evolution API v2.x: The correct endpoint might be different
        // Try multiple approaches to start the connection
        
        // Approach 1: GET /instance/connect/{instance}
        try {
            const { data } = await client().get(`/instance/connect/${instanceName()}`);
            console.log('Evolution connect (GET) response:', JSON.stringify(data).slice(0, 300));
            if (data && (data.qrcode || data.pairingCode || data.base64)) {
                return data;
            }
        } catch (err) {
            console.warn('GET /instance/connect failed:', err.response?.status);
        }
        
        // Approach 2: POST /instance/connect/{instance} with empty body
        try {
            const { data } = await client().post(`/instance/connect/${instanceName()}`, {});
            console.log('Evolution connect (POST) response:', JSON.stringify(data).slice(0, 300));
            if (data && (data.qrcode || data.pairingCode || data.base64)) {
                return data;
            }
        } catch (err) {
            console.warn('POST /instance/connect failed:', err.response?.status);
        }
        
        // Approach 3: PUT /instance/restart/{instance} to force restart
        try {
            const { data } = await client().put(`/instance/restart/${instanceName()}`);
            console.log('Evolution restart response:', JSON.stringify(data).slice(0, 300));
            return data;
        } catch (err) {
            console.warn('PUT /instance/restart failed:', err.response?.status);
        }
        
        return { msg: 'no_method_worked' };
    } catch (err) {
        console.error('Evolution connectInstance error:', err.message);
        return { error: err.response?.data || err.message };
    }
};

// Request pairing code instead of QR (Evolution API v2.x)
// More reliable than QR for some WhatsApp versions
exports.requestPairingCode = async (phoneNumber) => {
    if (!isConfigured()) throw new Error('Evolution API not configured');
    try {
        // Evolution API v2.x: Request pairing code
        // Phone number should be in format: 923001234567 (country code + number, no +)
        const { data } = await client().post(`/instance/fetchInstances/${instanceName()}/pairing-code`, {
            phoneNumber: phoneNumber,
        });
        console.log('Evolution pairing code response:', JSON.stringify(data).slice(0, 300));
        return data;
    } catch (err) {
        // Try alternative endpoint
        try {
            const { data } = await client().get(`/instance/connect/${instanceName()}`, {
                params: { number: phoneNumber }
            });
            console.log('Evolution pairing code (alt) response:', JSON.stringify(data).slice(0, 300));
            return data;
        } catch (err2) {
            console.error('Evolution pairing code failed:', err.response?.data || err.message);
            throw err;
        }
    }
};

// Send a plain text message — `number` is digits only (e.g., 9230012345678)
exports.sendText = async (number, text) => {
    if (!isConfigured()) throw new Error('Evolution API not configured');
    
    // Evolution API v1.7.4 uses different payload format
    const { data } = await client().post(`/message/sendText/${instanceName()}`, {
        number,
        textMessage: {
            text
        },
        delay: 0,
    });
    // Common shapes: { key: { id }, message } or { messageId }
    const messageId = data?.key?.id || data?.messageId || data?.id || '';
    return { messageId, raw: data };
};

// Send a poll — Evolution path: /message/sendPoll/{instance}
exports.sendPoll = async (number, { name, values, selectableCount = 1 }) => {
    if (!isConfigured()) throw new Error('Evolution API not configured');
    
    // Evolution API v1.7.4 uses different payload format
    const { data } = await client().post(`/message/sendPoll/${instanceName()}`, {
        number,
        pollMessage: {
            name,
            selectableCount,
            values
        },
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
