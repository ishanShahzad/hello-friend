/**
 * Expo Push Notification helper.
 * Sends pushes via the Expo push API and prunes invalid tokens from User docs.
 * No SDK dependency — uses fetch (Node 18+).
 */

const User = require('../models/User');

const EXPO_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100;

const isValidExpoToken = (t) =>
    typeof t === 'string' && (t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken['));

const chunk = (arr, size) => {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
};

/**
 * Send a push to one or more Expo tokens.
 * @param {string[]} tokens
 * @param {{ title: string, body: string, data?: object, channelId?: string, sound?: 'default'|null, badge?: number }} payload
 * @returns {Promise<{ invalidTokens: string[] }>}
 */
async function sendExpoPush(tokens, payload) {
    const valid = (tokens || []).filter(isValidExpoToken);
    if (!valid.length) return { invalidTokens: [] };

    const messages = valid.map((to) => ({
        to,
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
        sound: payload.sound === null ? null : 'default',
        channelId: payload.channelId || 'general',
        priority: 'high',
        ...(payload.badge != null ? { badge: payload.badge } : {}),
    }));

    const invalidTokens = [];

    for (const batch of chunk(messages, CHUNK_SIZE)) {
        try {
            const res = await fetch(EXPO_URL, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(batch),
            });
            const json = await res.json().catch(() => ({}));
            const tickets = Array.isArray(json?.data) ? json.data : [];
            tickets.forEach((ticket, i) => {
                if (ticket?.status === 'error') {
                    const errCode = ticket?.details?.error;
                    if (errCode === 'DeviceNotRegistered' || errCode === 'InvalidCredentials') {
                        invalidTokens.push(batch[i].to);
                    }
                    console.warn('[expoPush] error ticket:', ticket?.message, errCode);
                }
            });
        } catch (err) {
            console.error('[expoPush] batch send failed:', err.message);
        }
    }

    return { invalidTokens };
}

/**
 * Send a push to a specific user (looks up tokens by user id).
 * Auto-prunes invalid tokens from the user document.
 */
async function sendPushToUser(userId, payload) {
    if (!userId) return;
    try {
        const user = await User.findById(userId).select('expoPushTokens');
        if (!user?.expoPushTokens?.length) return;
        const { invalidTokens } = await sendExpoPush(user.expoPushTokens, payload);
        if (invalidTokens.length) {
            await User.updateOne(
                { _id: userId },
                { $pull: { expoPushTokens: { $in: invalidTokens } } }
            );
        }
    } catch (err) {
        console.error('[expoPush] sendPushToUser failed:', err.message);
    }
}

module.exports = { sendExpoPush, sendPushToUser, isValidExpoToken };
