// FIFO queue processor with random delay (8–25s) and retry/backoff.
// Persists state in MongoDB so Heroku dyno restarts don't drop pending jobs.

const WhatsAppPendingMessage = require('../../models/WhatsAppPendingMessage');
const WhatsAppConfig = require('../../models/WhatsAppConfig');
const evolution = require('./evolutionClient');
const {
    buildOrderListPayload,
    buildOrderConfirmationMessage,
    normalizePhone,
} = require('./messageBuilder');
const Order = require('../../models/Order');

const MIN_DELAY_MS = 8 * 1000;
const MAX_DELAY_MS = 25 * 1000;
const MAX_ATTEMPTS = 3;
const HOURLY_CAP = 60;

let timer = null;
let isProcessing = false;

const randomDelay = () =>
    Math.floor(MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS));

// Soft hourly cap tracking
const checkHourlyCap = async () => {
    const cfg = await WhatsAppConfig.findOne({ singletonKey: 'main' });
    if (!cfg) return true;
    const now = new Date();
    if (!cfg.sentWindowStartedAt || now - cfg.sentWindowStartedAt > 60 * 60 * 1000) {
        cfg.sentWindowStartedAt = now;
        cfg.sentInLastHour = 0;
        await cfg.save();
    }
    return cfg.sentInLastHour < HOURLY_CAP;
};

const incrementSentCounter = async () => {
    await WhatsAppConfig.updateOne(
        { singletonKey: 'main' },
        { $inc: { sentInLastHour: 1 }, $set: { lastSeen: new Date() } }
    );
};

// Enqueue: caller passes an already-saved Order with confirmation.token set
exports.enqueueOrderConfirmation = async (order) => {
    try {
        if (!order?.confirmation?.token) return null;
        const phone = normalizePhone(order.shippingInfo?.phone);
        if (!phone || phone.length < 8) {
            console.warn('[whatsapp] skip enqueue — invalid phone', order.orderId);
            return null;
        }

        // Avoid duplicate enqueue for the same order
        const existing = await WhatsAppPendingMessage.findOne({ order: order._id });
        if (existing) return existing;

        const pending = await WhatsAppPendingMessage.create({
            order: order._id,
            orderId: order.orderId,
            confirmationToken: order.confirmation.token,
            phone,
            buyerName: order.shippingInfo?.fullName || '',
            status: 'queued',
            nextAttemptAt: new Date(Date.now() + randomDelay()),
        });
        return pending;
    } catch (err) {
        console.error('[whatsapp] enqueue failed:', err.message);
        return null;
    }
};

const processOne = async () => {
    if (!evolution.isConfigured()) return;

    const cfg = await WhatsAppConfig.findOne({ singletonKey: 'main' });
    if (!cfg || cfg.status !== 'connected') return;

    const allowed = await checkHourlyCap();
    if (!allowed) return;

    // Atomically claim the next due job
    const now = new Date();
    const job = await WhatsAppPendingMessage.findOneAndUpdate(
        {
            status: 'queued',
            nextAttemptAt: { $lte: now },
        },
        { $set: { status: 'sending' } },
        { new: true, sort: { nextAttemptAt: 1 } }
    );
    if (!job) return;

    try {
        // Re-read order for fresh data
        const order = await Order.findById(job.order);
        if (!order) {
            job.status = 'failed';
            job.lastError = 'Order not found';
            await job.save();
            return;
        }

        // Skip if order was already confirmed/declined via another channel
        if (order.confirmation?.confirmedAt || order.confirmation?.declinedAt) {
            job.status = 'expired';
            await job.save();
            return;
        }

        // Verify the number is actually on WhatsApp BEFORE burning 3 send attempts on it.
        const existsOnWhatsApp = await evolution.checkWhatsAppNumber(job.phone);
        if (existsOnWhatsApp === false) {
            job.status = 'failed_invalid_number';
            job.lastError = `Phone ${job.phone} is not a WhatsApp account. Verify the number has country code (e.g. 923001234567 for Pakistan) and that WhatsApp is installed.`;
            job.attempts = (job.attempts || 0) + 1;
            await job.save();
            console.warn(`[whatsapp] skip order ${order.orderId} — ${job.phone} is not on WhatsApp`);
            return;
        }

        // ── List-first flow with text fallback ──
        //
        // sendList uses WhatsApp's LEGACY listType=SINGLE_SELECT format,
        // which actually renders tappable buttons on regular
        // linked-device WhatsApp (unlike sendButtons → native-flow, which
        // Meta silently drops for non-Cloud-API senders).
        //
        // The buyer sees one "Confirm or Cancel" tap-to-open button.
        // Opening it shows "✅ Confirm order" and "❌ Cancel order" rows.
        // Tapping a row produces a listResponseMessage webhook event that
        // carries the rowId (confirm_ORD-xxx / cancel_ORD-xxx) — parsed in
        // webhookHandler.extractDecision.
        //
        // If sendList throws (network error, instance disconnected, etc.),
        // we fall back to a plain text YES/NO message so the buyer is
        // never stuck.
        const listPayload = buildOrderListPayload(order);
        let sendRes;
        let usedFallback = false;
        try {
            sendRes = await evolution.sendList(job.phone, listPayload);
        } catch (listErr) {
            console.warn(
                `[whatsapp] sendList failed for order ${order.orderId}, falling back to text:`,
                listErr.response?.data || listErr.message
            );
            usedFallback = true;
            const text = buildOrderConfirmationMessage(order);
            sendRes = await evolution.sendText(job.phone, text);
        }
        await incrementSentCounter();

        job.summaryMessageId = sendRes.messageId || '';
        job.pollMessageId = ''; // not used — match by phone in the webhook
        job.status = 'sent';
        job.sentAt = new Date();
        job.attempts = (job.attempts || 0) + 1;
        await job.save();

        console.log(
            `[whatsapp] sent order ${order.orderId} → ${job.phone}` +
            (usedFallback ? ' (text fallback)' : ' (list)')
        );
    } catch (err) {
        const attempts = (job.attempts || 0) + 1;
        const status = err.response?.status;
        const errBody = err.response?.data;

        const notOnWhatsApp =
            status === 400 &&
            Array.isArray(errBody?.response?.message) &&
            errBody.response.message.some(m => m?.exists === false);

        const failedFinal = notOnWhatsApp || attempts >= MAX_ATTEMPTS;
        job.attempts = attempts;
        job.lastError = errBody ? JSON.stringify(errBody).slice(0, 500) : err.message;

        if (notOnWhatsApp) {
            job.status = 'failed_invalid_number';
            job.lastError = `Number ${job.phone} is not registered on WhatsApp. Check country code and try again.`;
        } else if (failedFinal) {
            job.status = 'failed';
        } else {
            job.status = 'queued';
            const backoff = attempts === 1 ? 30 * 1000 : 2 * 60 * 1000;
            job.nextAttemptAt = new Date(Date.now() + backoff);
        }
        await job.save();
        console.error(`[whatsapp] send failed (attempt ${attempts}, status=${status}):`, job.lastError);
    }
};

const tick = async () => {
    if (isProcessing) return;
    isProcessing = true;
    try {
        await processOne();
    } catch (err) {
        console.error('[whatsapp] queue tick error:', err.message);
    } finally {
        isProcessing = false;
    }
};

exports.startQueueProcessor = () => {
    if (timer) return;
    // Poll every 5s; random delay enforced via job.nextAttemptAt
    timer = setInterval(tick, 5000);
    console.log('[whatsapp] queue processor started');
};

exports.stopQueueProcessor = () => {
    if (timer) clearInterval(timer);
    timer = null;
};

// ──────────────────────────────────────────────────────────────────────────
// Reply matching — called by webhook handler.
// Previously we matched by pollMessageId; now we match by buyer phone
// because a reply to a plain text message doesn't always quote the original.
//
// Rules:
//   - Must have a job in status 'sent' for this phone (most recent first).
//   - Idempotent: if the job is already 'voted_yes'/'voted_no', return it so
//     the caller can detect a vote change but not double-count.
// ──────────────────────────────────────────────────────────────────────────
exports.markVotedByPhone = async (phone, vote) => {
    const status = vote === 'yes' ? 'voted_yes' : 'voted_no';

    // Look at the newest matching pending job for this phone that's still
    // waiting for (or may have flipped) a reply.
    const job = await WhatsAppPendingMessage.findOne({
        phone,
        status: { $in: ['sent', 'sending', 'voted_yes', 'voted_no'] },
    }).sort({ createdAt: -1 });

    if (!job) return null;

    // If it's already the same vote, no-op (idempotent). If it's the other
    // vote, update it (handled as a vote-change by webhookHandler).
    if (job.status !== status) {
        job.status = status;
        job.repliedAt = new Date();
        await job.save();
    }
    return job;
};

// Legacy — still used by older code paths until fully removed
exports.markVoted = async (pollMessageId, vote) => {
    const status = vote === 'yes' ? 'voted_yes' : 'voted_no';
    const job = await WhatsAppPendingMessage.findOneAndUpdate(
        { pollMessageId, status: { $in: ['sent', 'sending'] } },
        { $set: { status, repliedAt: new Date() } },
        { new: true }
    );
    return job;
};
