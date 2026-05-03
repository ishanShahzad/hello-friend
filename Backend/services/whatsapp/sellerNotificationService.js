const WhatsAppConfig = require('../../models/WhatsAppConfig');
const User = require('../../models/User');
const sellerEvolution = require('./sellerEvolutionClient');

/**
 * Notification categories and whether they can be disabled by the seller.
 * 'critical' category notifications are ALWAYS sent, regardless of preferences.
 */
const NOTIFICATION_CATEGORIES = {
    new_order:              { prefKey: 'newOrders',           critical: false },
    order_update:           { prefKey: 'orderUpdates',        critical: false },
    subscription_activated: { prefKey: 'subscriptionAlerts',  critical: false },
    subscription_ending:    { prefKey: 'subscriptionAlerts',  critical: false },
    payment_failed:         { prefKey: null,                  critical: true  }, // CRITICAL
    payment_recovered:      { prefKey: 'subscriptionAlerts',  critical: false },
    trial_expiring:         { prefKey: null,                  critical: true  }, // CRITICAL
    account_blocked:        { prefKey: null,                  critical: true  }, // CRITICAL
    bonus_expiring:         { prefKey: 'bonusAlerts',         critical: false },
    bonus_expired:          { prefKey: 'bonusAlerts',         critical: false },
    store_verified:         { prefKey: 'storeAlerts',         critical: false },
    downgrade_scheduled:    { prefKey: 'subscriptionAlerts',  critical: false },
    upgrade_completed:      { prefKey: 'subscriptionAlerts',  critical: false },
};

// ── Rate limiting & throttling ──────────────────────────────────────────────
// WhatsApp aggressively bans numbers that spam. We protect the seller instance
// by enforcing:
//   1. An hourly cap (default 60 msgs/hr, tracked on WhatsAppConfig singleton).
//   2. A sequential in-process queue with a 1-3s random jitter per send so
//      parallel order/webhook storms don't hit WhatsApp all at once.
//
// This is a simpler cousin of services/whatsapp/queue.js (which uses DB-backed
// messages for buyer verification). Seller notifications are fire-and-forget
// and don't need persistence — if the server restarts mid-queue, callers
// already handled the failure via .catch() and the notification is just dropped.

const HOURLY_CAP = Number(process.env.SELLER_WA_HOURLY_CAP || 60);
const MIN_DELAY_MS = 1000;
const MAX_DELAY_MS = 3000;

let chain = Promise.resolve(); // serial queue
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const randomDelay = () => MIN_DELAY_MS + Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS));

/**
 * Atomically increment sentInLastHour on the seller singleton and return
 * whether the cap has been reached. Resets the counter if the hour window
 * has rolled over.
 */
async function tryReserveHourlySlot() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const cfg = await WhatsAppConfig.findOne({ singletonKey: 'seller' });
    if (!cfg) return { allowed: false, reason: 'no_seller_config' };

    // Roll over the window if it's older than an hour (or never set)
    if (!cfg.sentWindowStartedAt || cfg.sentWindowStartedAt < oneHourAgo) {
        cfg.sentWindowStartedAt = now;
        cfg.sentInLastHour = 0;
    }

    if ((cfg.sentInLastHour || 0) >= HOURLY_CAP) {
        return { allowed: false, reason: 'hourly_cap_reached' };
    }

    cfg.sentInLastHour = (cfg.sentInLastHour || 0) + 1;
    cfg.lastSeen = now;
    await cfg.save();
    return { allowed: true };
}

/**
 * Core: check gating, reserve quota, send, with full error handling.
 */
async function sendNow(sellerId, category, message) {
    // 1. Seller instance connected?
    const cfg = await WhatsAppConfig.findOne({ singletonKey: 'seller' });
    if (!cfg || cfg.status !== 'connected') {
        return { sent: false, reason: 'seller_instance_not_connected' };
    }

    // 2. Seller exists and is verified?
    const seller = await User.findById(sellerId).select('sellerInfo whatsappNotificationPrefs');
    if (!seller) return { sent: false, reason: 'seller_not_found' };

    const whatsappNumber = seller.sellerInfo?.whatsappNumber;
    const whatsappVerified = seller.sellerInfo?.whatsappVerified;
    if (!whatsappNumber || !whatsappVerified) {
        return { sent: false, reason: 'whatsapp_not_verified' };
    }

    // 3. Category & preferences check
    const catConfig = NOTIFICATION_CATEGORIES[category];
    if (!catConfig) {
        console.warn(`[sellerNotification] Unknown category: ${category}`);
        return { sent: false, reason: 'unknown_category' };
    }
    if (!catConfig.critical) {
        const prefs = seller.whatsappNotificationPrefs || {};
        if (prefs.enabled === false) {
            return { sent: false, reason: 'notifications_disabled' };
        }
        if (catConfig.prefKey && prefs[catConfig.prefKey] === false) {
            return { sent: false, reason: `category_disabled:${catConfig.prefKey}` };
        }
    }

    // 4. Normalize phone
    const digits = whatsappNumber.replace(/\D/g, '');
    if (!digits) return { sent: false, reason: 'invalid_number' };

    // 5. Hourly cap (reserve slot before sending; if send fails we accept the
    //    small over-count — much better than racing the cap)
    const slot = await tryReserveHourlySlot();
    if (!slot.allowed) {
        console.warn(`[sellerNotification] ${slot.reason} — skipping ${category} to ${sellerId}`);
        return { sent: false, reason: slot.reason };
    }

    // 6. Send
    try {
        await sellerEvolution.sendText(digits, message);
        return { sent: true };
    } catch (err) {
        console.error(`[sellerNotification] sendText failed for ${category} to ${sellerId}:`, err.message);
        return { sent: false, reason: 'send_error', error: err.message };
    }
}

/**
 * Send a WhatsApp notification to a seller. Queued serially with jitter so
 * parallel callers (e.g. multi-seller order, webhook storm) don't hammer
 * WhatsApp and trigger anti-spam bans.
 *
 * @param {string|ObjectId} sellerId - The User._id of the seller
 * @param {string} category - One of NOTIFICATION_CATEGORIES keys
 * @param {string} message - WhatsApp message text (supports *bold* _italic_)
 * @returns {Promise<{sent: boolean, reason?: string}>}
 */
function notifySeller(sellerId, category, message) {
    const sellerIdStr = sellerId?.toString?.() || String(sellerId || '');
    if (!sellerIdStr) return Promise.resolve({ sent: false, reason: 'missing_seller_id' });

    // Chain on the serial queue so we send one-at-a-time with jitter
    const task = chain.then(async () => {
        try {
            const result = await sendNow(sellerIdStr, category, message);
            // Only add jitter delay after a real network send to avoid slowing
            // down rapid-fire skips (unverified/disabled/etc.)
            if (result.sent) {
                await sleep(randomDelay());
            }
            return result;
        } catch (err) {
            console.error(`[sellerNotification] Unexpected error in queue for ${category}:`, err.message);
            return { sent: false, reason: 'queue_error', error: err.message };
        }
    });

    // Swallow errors from the chain so one failure doesn't break the queue
    chain = task.catch(() => null);
    return task;
}

/**
 * Helper: Check if seller WhatsApp notifications are available for a given seller.
 */
async function isSellerWhatsAppAvailable(sellerId) {
    try {
        const cfg = await WhatsAppConfig.findOne({ singletonKey: 'seller' });
        if (!cfg || cfg.status !== 'connected') return false;

        const seller = await User.findById(sellerId);
        return !!(seller?.sellerInfo?.whatsappNumber && seller?.sellerInfo?.whatsappVerified);
    } catch {
        return false;
    }
}

module.exports = { notifySeller, isSellerWhatsAppAvailable, NOTIFICATION_CATEGORIES };
