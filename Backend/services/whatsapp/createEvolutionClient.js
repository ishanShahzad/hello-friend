// Factory that creates an Evolution API client bound to a specific instance.
// Docs: https://doc.evolution-api.com/v2/
//
// Usage:
//   const client = createEvolutionClient('EVOLUTION_INSTANCE_NAME', 'rozare-main');
//   const sellerClient = createEvolutionClient('EVOLUTION_SELLER_INSTANCE_NAME', 'rozare-seller');

const axios = require('axios');
const QRCode = require('qrcode');

// Shared helpers (not instance-specific)

const baseUrl = () => (process.env.EVOLUTION_API_URL || '').replace(/\/+$/, '');
const apiKey = () => process.env.EVOLUTION_API_KEY || '';

const makeClient = () => axios.create({
    baseURL: baseUrl(),
    timeout: 25000,
    headers: { apikey: apiKey(), 'Content-Type': 'application/json' },
});

// Turn a raw QR "code" string into a base64 PNG data URL.
const qrTextToDataUrl = async (raw) => {
    if (!raw || typeof raw !== 'string') return '';
    if (raw.startsWith('data:')) return raw;
    if (/^[A-Za-z0-9+/=]{200,}$/.test(raw)) {
        return `data:image/png;base64,${raw}`;
    }
    try {
        return await QRCode.toDataURL(raw, { errorCorrectionLevel: 'L', margin: 1, width: 320 });
    } catch (err) {
        console.warn('[evolution] qrTextToDataUrl failed:', err.message);
        return '';
    }
};

// Best-effort: extract QR (base64 data URL) and pairing code from any v2 response shape.
const extractQrFromResponse = async (data) => {
    if (!data) return { base64: '', code: '', rawCode: '' };

    const src = data?.instance || data;

    const pairingCode = src?.pairingCode || data?.pairingCode || '';

    const rawCode = (typeof src?.code === 'string' && src.code.length > 20 ? src.code : '') ||
                    (typeof data?.code === 'string' && data.code.length > 20 ? data.code : '');

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

/**
 * Creates an Evolution API client bound to a specific instance name.
 * @param {string} instanceEnvVar - Environment variable name for the instance (e.g. 'EVOLUTION_INSTANCE_NAME')
 * @param {string} defaultName - Default instance name if env var is not set (e.g. 'rozare-main')
 * @returns {object} - All exported functions for this instance
 */
function createEvolutionClient(instanceEnvVar, defaultName) {
    const instanceName = () => process.env[instanceEnvVar] || defaultName;
    const isConfigured = () => Boolean(baseUrl() && apiKey());
    const client = () => makeClient();

    const createInstance = async () => {
        if (!isConfigured()) throw new Error('Evolution API not configured');
        try {
            const { data } = await client().post('/instance/create', {
                instanceName: instanceName(),
                qrcode: true,
                integration: 'WHATSAPP-BAILEYS',
                rejectCall: false,
                groupsIgnore: true,
                alwaysOnline: false,
                readMessages: false,
                readStatus: false,
                syncFullHistory: false,
            });
            console.log(`[evolution:${instanceName()}] instance created:`, JSON.stringify(data).slice(0, 300));
            return data;
        } catch (err) {
            const msg = (err.response?.data?.message || err.response?.data?.response?.message || '').toString();
            const status = err.response?.status;
            if (status === 403 || status === 409 || /already|in use|exists/i.test(msg)) {
                console.log(`[evolution:${instanceName()}] instance already exists`);
                return { msg: 'instance_exists' };
            }
            throw err;
        }
    };

    const getQRCode = async () => {
        if (!isConfigured()) throw new Error('Evolution API not configured');

        let connectData = null;
        try {
            const resp = await client().get(`/instance/connect/${instanceName()}`);
            connectData = resp.data;
            console.log(`[evolution:${instanceName()}] /instance/connect response:`, JSON.stringify(connectData).slice(0, 300));
        } catch (err) {
            const status = err.response?.status;
            console.warn(`[evolution:${instanceName()}] /instance/connect failed:`, status, err.message);
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

        try {
            const { data: stateData } = await client().get(`/instance/connectionState/${instanceName()}`);
            const state = stateData?.instance?.state || stateData?.state || '';
            if (state === 'open') {
                return { base64: '', code: '', state: 'open', raw: stateData };
            }
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
            console.warn(`[evolution:${instanceName()}] /instance/connectionState failed:`, err.message);
            return { base64: '', code: '', state: 'close', raw: null };
        }
    };

    const getStatus = async () => {
        if (!isConfigured()) return { state: 'not_configured' };
        try {
            const { data } = await client().get(`/instance/connectionState/${instanceName()}`);
            return data?.instance || data || {};
        } catch (err) {
            return { state: 'error', error: err.response?.data || err.message };
        }
    };

    const logout = async () => {
        if (!isConfigured()) return { msg: 'not_configured' };
        try {
            const { data } = await client().delete(`/instance/logout/${instanceName()}`);
            return data;
        } catch (err) {
            return { error: err.response?.data || err.message };
        }
    };

    const deleteInstance = async () => {
        if (!isConfigured()) return { msg: 'not_configured' };
        try {
            const { data } = await client().delete(`/instance/delete/${instanceName()}`);
            return data;
        } catch (err) {
            return { error: err.response?.data || err.message };
        }
    };

    const restartInstance = async () => {
        if (!isConfigured()) return { msg: 'not_configured' };
        try {
            const { data } = await client().put(`/instance/restart/${instanceName()}`);
            return data;
        } catch (err) {
            return { error: err.response?.data || err.message };
        }
    };

    const connectInstance = async () => {
        if (!isConfigured()) return { msg: 'not_configured' };
        try {
            const { data } = await client().get(`/instance/connect/${instanceName()}`);
            return data;
        } catch (err) {
            console.error(`[evolution:${instanceName()}] connectInstance error:`, err.message);
            return { error: err.response?.data || err.message };
        }
    };

    const requestPairingCode = async (phoneNumber) => {
        if (!isConfigured()) throw new Error('Evolution API not configured');
        const cleanNumber = String(phoneNumber || '').replace(/[^0-9]/g, '');
        if (!cleanNumber) throw new Error('Phone number is required');
        try {
            const { data } = await client().get(`/instance/connect/${instanceName()}`, {
                params: { number: cleanNumber },
            });
            console.log(`[evolution:${instanceName()}] pairing-code response:`, JSON.stringify(data).slice(0, 300));
            return {
                code: data?.pairingCode || '',
                pairingCode: data?.pairingCode || '',
                rawQr: data?.code || '',
                raw: data,
            };
        } catch (err) {
            console.error(`[evolution:${instanceName()}] pairing-code failed:`, err.response?.data || err.message);
            throw err;
        }
    };

    const sendText = async (number, text) => {
        if (!isConfigured()) throw new Error('Evolution API not configured');
        const { data } = await client().post(`/message/sendText/${instanceName()}`, {
            number,
            text,
            delay: 0,
        });
        const messageId = data?.key?.id || data?.messageId || data?.id || '';
        return { messageId, raw: data };
    };

    const sendPoll = async (number, { name, values, selectableCount = 1 }) => {
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

    const sendList = async (number, { title, description = '', buttonText, footerText = '', sections }) => {
        if (!isConfigured()) throw new Error('Evolution API not configured');
        if (!Array.isArray(sections) || sections.length === 0) {
            throw new Error('sendList: sections array is required');
        }
        const { data } = await client().post(`/message/sendList/${instanceName()}`, {
            number,
            title,
            description,
            buttonText,
            footerText,
            sections,
            delay: 0,
        });
        const messageId = data?.key?.id || data?.messageId || data?.id || '';
        return { messageId, raw: data };
    };

    const sendButtons = async (number, { title, description = '', footer = '', buttons }) => {
        if (!isConfigured()) throw new Error('Evolution API not configured');
        if (!Array.isArray(buttons) || buttons.length === 0) {
            throw new Error('sendButtons: buttons array is required');
        }
        const payload = {
            number,
            title,
            description,
            footer,
            buttons: buttons.map((b) => ({
                type: b.type || 'reply',
                displayText: b.displayText,
                id: b.id,
            })),
            delay: 0,
        };
        const { data } = await client().post(`/message/sendButtons/${instanceName()}`, payload);
        const messageId = data?.key?.id || data?.messageId || data?.id || '';
        return { messageId, raw: data };
    };

    const setWebhook = async (url, secret = '') => {
        if (!isConfigured()) throw new Error('Evolution API not configured');
        const payload = {
            webhook: {
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
            },
        };
        const { data } = await client().post(`/webhook/set/${instanceName()}`, payload);
        return data;
    };

    const checkWhatsAppNumber = async (number) => {
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
            console.warn(`[evolution:${instanceName()}] checkWhatsAppNumber failed:`, err.response?.data || err.message);
            return null;
        }
    };

    return {
        createInstance,
        getQRCode,
        getStatus,
        logout,
        deleteInstance,
        restartInstance,
        connectInstance,
        requestPairingCode,
        sendText,
        sendPoll,
        sendList,
        sendButtons,
        setWebhook,
        checkWhatsAppNumber,
        isConfigured,
        instanceName,
    };
}

// Export shared helpers for use by other modules if needed
createEvolutionClient.qrTextToDataUrl = qrTextToDataUrl;
createEvolutionClient.extractQrFromResponse = extractQrFromResponse;

module.exports = createEvolutionClient;
