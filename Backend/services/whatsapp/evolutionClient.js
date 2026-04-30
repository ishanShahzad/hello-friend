// Thin wrapper around the Evolution API REST endpoints (v2.x).
// Docs: https://doc.evolution-api.com/v2/
//
// Key differences from v1.7.4:
//   - Message payloads are flat: { number, text } instead of { number, textMessage: { text } }
//   - Poll payload is flat:      { number, name, values, selectableCount } instead of nested pollMessage
//   - /instance/connect returns  { pairingCode, code, count } where `code` is the raw QR string
//     (we convert it to a PNG data URL with the `qrcode` npm package so the admin UI can render it)
//   - /instance/fetchInstances returns [{ instance: { status: 'open'|'close'|'connecting', ... }}]
//     (no qrcode field here — only connection state)
//   - /webhook/set uses { enabled, url, webhookByEvents, webhookBase64, events } (camelCase)

const axios = require('axios');
const QRCode = require('qrcode');

const baseUrl = () => (process.env.EVOLUTION_API_URL || '').replace(/\/+$/, '');
const apiKey = () => process.env.EVOLUTION_API_KEY || '';
const instanceName = () => process.env.EVOLUTION_INSTANCE_NAME || 'rozare-main';

const isConfigured = () => Boolean(baseUrl() && apiKey());

const client = () => axios.create({
    baseURL: baseUrl(),
    timeout: 25000,
    headers: { apikey: apiKey(), 'Content-Type': 'application/json' },
});

// Turn a raw QR "code" string into a base64 PNG data URL we can render in the admin modal.
// Evolution v2 returns the raw QR text (e.g. "2@y8eK+bjt...") from /instance/connect — not a base64 image.
const qrTextToDataUrl = async (raw) => {
    if (!raw || typeof raw !== 'string') return '';
    if (raw.startsWith('data:')) return raw; // already a data URL
    if (/^[A-Za-z0-9+/=]{200,}$/.test(raw)) {
        // Looks like base64 already — wrap it
        return `data:image/png;base64,${raw}`;
    }
    try {
        // Typical WhatsApp QR payloads start with "2@" — convert to PNG
        return await QRCode.toDataURL(raw, { errorCorrectionLevel: 'L', margin: 1, width: 320 });
    } catch (err) {
        console.warn('[evolution] qrTextToDataUrl failed:', err.message);
        return '';
    }
};

// Best-effort: extract QR (base64 data URL) and pairing code from any v2 response shape we've seen.
const extractQrFromResponse = async (data) => {
    if (!data) return { base64: '', code: '', rawCode: '' };

    // Common v2 /instance/connect shape: { pairingCode, code, count }
    // Sometimes Evolution nests under data.instance or data.qrcode depending on build.
    const src = data?.instance || data;

    // Pairing code (8-char human code) — separate from the QR string
    const pairingCode = src?.pairingCode || data?.pairingCode || '';

    // Raw QR text — v2 puts the full "2@..." payload in .code
    const rawCode = (typeof src?.code === 'string' && src.code.length > 20 ? src.code : '') ||
                    (typeof data?.code === 'string' && data.code.length > 20 ? data.code : '');

    // Some builds also attach a ready base64 PNG
    const rawBase64 =
        src?.qrcode?.base64 ||
        data?.qrcode?.base64 ||
        src?.base64 ||
        data?.base64 ||
        '';

    let base64 = '';
    if (rawBase64) {
        base64 = rawBase64.startsWith('data:') ? rawBase64 : `data:image/png;base64,${rawBase64}`;
    } else if (rawCode) {
        base64 = await qrTextToDataUrl(rawCode);
    }

    return { base64, code: pairingCode, rawCode };
};

// Create (or no-op fetch if it already exists) the WhatsApp instance.
// In v2 we can register the webhook in the same call — but since the admin endpoint
// registers the webhook separately after connection, we keep creation minimal here.
exports.createInstance = async () => {
    if (!isConfigured()) throw new Error('Evolution API not configured');
    try {
        const { data } = await client().post('/instance/create', {
            instanceName: instanceName(),
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
            // Reasonable production defaults:
            rejectCall: false,
            groupsIgnore: true,
            alwaysOnline: false,
            readMessages: false,
            readStatus: false,
            syncFullHistory: false,
        });
        console.log('[evolution] instance created:', JSON.stringify(data).slice(0, 300));
        return data;
    } catch (err) {
        // 403 (already exists), 409 (conflict), or message containing "already" — not fatal
        const msg = (err.response?.data?.message || err.response?.data?.response?.message || '').toString();
        const status = err.response?.status;
        if (status === 403 || status === 409 || /already|in use|exists/i.test(msg)) {
            console.log('[evolution] instance already exists');
            return { msg: 'instance_exists' };
        }
        throw err;
    }
};

// GET /instance/connect/{instance} — v2's authoritative way to obtain the QR / pairing code.
// Response: { pairingCode, code, count }
exports.getQRCode = async () => {
    if (!isConfigured()) throw new Error('Evolution API not configured');

    // Always try /instance/connect first — this is what actually triggers QR generation in v2
    let connectData = null;
    try {
        const resp = await client().get(`/instance/connect/${instanceName()}`);
        connectData = resp.data;
        console.log('[evolution] /instance/connect response:', JSON.stringify(connectData).slice(0, 300));
    } catch (err) {
        const status = err.response?.status;
        // 404 means instance doesn't exist yet — caller will create it and retry
        console.warn('[evolution] /instance/connect failed:', status, err.message);
        if (status === 404) {
            return { base64: '', code: '', state: 'not_found', raw: err.response?.data || null };
        }
    }

    if (connectData) {
        const { base64, code, rawCode } = await extractQrFromResponse(connectData);
        if (base64 || code) {
            return { base64, code, state: 'connecting', raw: connectData, rawCode };
        }
    }

    // Fallback: poll /instance/connectionState to see if already connected
    try {
        const { data: stateData } = await client().get(`/instance/connectionState/${instanceName()}`);
        const state = stateData?.instance?.state || stateData?.state || '';
        if (state === 'open') {
            return { base64: '', code: '', state: 'open', raw: stateData };
        }
        // Keep polling /instance/connect a couple times — some v2 builds need a second hit
        for (let attempt = 0; attempt < 5; attempt++) {
            await new Promise(r => setTimeout(r, 1200));
            try {
                const { data: retry } = await client().get(`/instance/connect/${instanceName()}`);
                const out = await extractQrFromResponse(retry);
                if (out.base64 || out.code) {
                    return { base64: out.base64, code: out.code, state: 'connecting', raw: retry, rawCode: out.rawCode };
                }
            } catch { /* try again */ }
        }
        return { base64: '', code: '', state: state || 'close', raw: stateData };
    } catch (err) {
        console.warn('[evolution] /instance/connectionState failed:', err.message);
        return { base64: '', code: '', state: 'close', raw: null };
    }
};

// GET /instance/connectionState/{instance} — returns { instance: { instanceName, state: 'open'|'close'|'connecting' } }
exports.getStatus = async () => {
    if (!isConfigured()) return { state: 'not_configured' };
    try {
        const { data } = await client().get(`/instance/connectionState/${instanceName()}`);
        return data?.instance || data || {};
    } catch (err) {
        return { state: 'error', error: err.response?.data || err.message };
    }
};

exports.logout = async () => {
    if (!isConfigured()) return { msg: 'not_configured' };
    try {
        // v2 uses DELETE /instance/logout/{instance}
        const { data } = await client().delete(`/instance/logout/${instanceName()}`);
        return data;
    } catch (err) {
        return { error: err.response?.data || err.message };
    }
};

// Hard-delete the instance so it can be recreated cleanly.
exports.deleteInstance = async () => {
    if (!isConfigured()) return { msg: 'not_configured' };
    try {
        const { data } = await client().delete(`/instance/delete/${instanceName()}`);
        return data;
    } catch (err) {
        return { error: err.response?.data || err.message };
    }
};

// PUT /instance/restart/{instance} — v2 supports this to force a re-pair
exports.restartInstance = async () => {
    if (!isConfigured()) return { msg: 'not_configured' };
    try {
        const { data } = await client().put(`/instance/restart/${instanceName()}`);
        return data;
    } catch (err) {
        return { error: err.response?.data || err.message };
    }
};

// Trigger QR generation (alias for getQRCode for the controller's convenience).
exports.connectInstance = async () => {
    if (!isConfigured()) return { msg: 'not_configured' };
    try {
        const { data } = await client().get(`/instance/connect/${instanceName()}`);
        return data;
    } catch (err) {
        console.error('[evolution] connectInstance error:', err.message);
        return { error: err.response?.data || err.message };
    }
};

// Request an 8-character pairing code for a specific phone (alternative to QR).
// v2: pass ?number=<phone> to /instance/connect/{instance}
exports.requestPairingCode = async (phoneNumber) => {
    if (!isConfigured()) throw new Error('Evolution API not configured');
    const cleanNumber = String(phoneNumber || '').replace(/[^0-9]/g, '');
    if (!cleanNumber) throw new Error('Phone number is required');
    try {
        const { data } = await client().get(`/instance/connect/${instanceName()}`, {
            params: { number: cleanNumber },
        });
        console.log('[evolution] pairing-code response:', JSON.stringify(data).slice(0, 300));
        // v2 returns { pairingCode, code, count }
        return {
            code: data?.pairingCode || '',
            pairingCode: data?.pairingCode || '',
            rawQr: data?.code || '',
            raw: data,
        };
    } catch (err) {
        console.error('[evolution] pairing-code failed:', err.response?.data || err.message);
        throw err;
    }
};

// ─── Messaging — Evolution API v2 FLAT payload format ─────────────────────────
// `number` is digits only (e.g., "923001234567")

// POST /message/sendText/{instance}  —  { number, text, delay? }
exports.sendText = async (number, text) => {
    if (!isConfigured()) throw new Error('Evolution API not configured');
    const { data } = await client().post(`/message/sendText/${instanceName()}`, {
        number,
        text,
        delay: 0,
    });
    const messageId = data?.key?.id || data?.messageId || data?.id || '';
    return { messageId, raw: data };
};

// POST /message/sendPoll/{instance}  —  { number, name, selectableCount, values, delay? }
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

// Register the webhook URL — v2 payload uses camelCase fields.
// POST /webhook/set/{instance}  —  { enabled, url, webhookByEvents, webhookBase64, events, headers? }
exports.setWebhook = async (url, secret = '') => {
    if (!isConfigured()) throw new Error('Evolution API not configured');
    const { data } = await client().post(`/webhook/set/${instanceName()}`, {
        enabled: true,
        url,
        webhookByEvents: false,
        webhookBase64: false,
        events: [
            'MESSAGES_UPSERT',
            'MESSAGES_UPDATE',
            'CONNECTION_UPDATE',
            'QRCODE_UPDATED',
        ],
        ...(secret ? { headers: { 'x-rozare-webhook-secret': secret } } : {}),
    });
    return data;
};

// Check whether a phone number is registered on WhatsApp.
// POST /chat/whatsappNumbers/{instance}  body: { numbers: ["923001234567"] }
// Response: [{ exists: boolean, jid: string, number: string }]
// Returns `true` / `false`, or `null` if the check itself couldn't be completed
// (network error, endpoint missing on an old build, etc.) so callers can decide
// whether to proceed optimistically or bail out.
exports.checkWhatsAppNumber = async (number) => {
    if (!isConfigured()) return null;
    const clean = String(number || '').replace(/\D/g, '');
    if (!clean) return false;
    try {
        const { data } = await client().post(`/chat/whatsappNumbers/${instanceName()}`, {
            numbers: [clean],
        });
        if (Array.isArray(data) && data.length > 0) {
            return Boolean(data[0]?.exists);
        }
        return null;
    } catch (err) {
        console.warn('[evolution] checkWhatsAppNumber failed:', err.response?.data || err.message);
        return null; // unknown — let the caller try to send anyway
    }
};

exports.isConfigured = isConfigured;
exports.instanceName = instanceName;
