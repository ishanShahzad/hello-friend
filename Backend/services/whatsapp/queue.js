// FIFO queue processor with random delay (8–25s) and retry/backoff.
// Persists state in MongoDB so Heroku dyno restarts don't drop pending jobs.

const WhatsAppPendingMessage = require('../../models/WhatsAppPendingMessage');
const WhatsAppConfig = require('../../models/WhatsAppConfig');
const evolution = require('./evolutionClient');
const { buildOrderSummaryText, buildPollPayload, normalizePhone } = require('./messageBuilder');
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

        const summaryText = buildOrderSummaryText(order);
        const summaryRes = await evolution.sendText(job.phone, summaryText);
        await incrementSentCounter();

        // Small natural pause between text + poll
        await new Promise(r => setTimeout(r, 1500 + Math.random() * 1500));

        const pollPayload = buildPollPayload(order);
        const pollRes = await evolution.sendPoll(job.phone, pollPayload);
        await incrementSentCounter();

        job.summaryMessageId = summaryRes.messageId || '';
        job.pollMessageId = pollRes.messageId || '';
        job.status = 'sent';
        job.sentAt = new Date();
        job.attempts = (job.attempts || 0) + 1;
        await job.save();

        console.log(`[whatsapp] sent order ${order.orderId} → ${job.phone}`);
    } catch (err) {
        const attempts = (job.attempts || 0) + 1;
        const failedFinal = attempts >= MAX_ATTEMPTS;
        job.attempts = attempts;
        job.lastError = err.response?.data ? JSON.stringify(err.response.data).slice(0, 500) : err.message;
        if (failedFinal) {
            job.status = 'failed';
        } else {
            job.status = 'queued';
            // Exponential backoff: 30s, 2min
            const backoff = attempts === 1 ? 30 * 1000 : 2 * 60 * 1000;
            job.nextAttemptAt = new Date(Date.now() + backoff);
        }
        await job.save();
        console.error(`[whatsapp] send failed (attempt ${attempts}):`, job.lastError);
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

// Mark a pending message as voted — called by webhook handler
exports.markVoted = async (pollMessageId, vote) => {
    const status = vote === 'yes' ? 'voted_yes' : 'voted_no';
    const job = await WhatsAppPendingMessage.findOneAndUpdate(
        { pollMessageId, status: { $in: ['sent', 'sending'] } },
        { $set: { status, repliedAt: new Date() } },
        { new: true }
    );
    return job;
};
