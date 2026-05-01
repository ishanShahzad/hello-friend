// Parses Evolution API webhook events and drives the order confirmation flow.
//
// What this handles:
//   - CONNECTION_UPDATE  → keeps WhatsAppConfig in sync so the admin status badge is accurate.
//   - MESSAGES_UPSERT    → looks at inbound buyer messages and interprets YES/NO replies
//                         (no more polls — we send a single plain text and parse the reply).
//
// Side-effects on CONFIRM:
//   1. order.orderStatus = 'confirmed', confirmation.* timestamps updated
//   2. Friendly thank-you reply sent on WhatsApp
//   3. Seller notified via email + Expo push + persistent in-app Notification
//
// Side-effects on CANCEL:
//   1. order.orderStatus = 'cancelled', confirmation.declinedAt set
//   2. Friendly "got it, cancelled" reply sent
//   3. Seller notified the buyer backed out

const Order = require('../../models/Order');
const Product = require('../../models/Product');
const User = require('../../models/User');
const Notification = require('../../models/Notification');
const WhatsAppConfig = require('../../models/WhatsAppConfig');
const { sendEmail } = require('../../controllers/mailController');
const { sellerOrderConfirmedByBuyerEmail } = require('../../utils/emailTemplates');
const { sendPushToUser } = require('../../utils/expoPush');
const { markVotedByPhone } = require('./queue');
const { parseConfirmReply } = require('./messageBuilder');
const evolution = require('./evolutionClient');

// ──────────────────────────────────────────────────────────────────────────
// Outgoing friendly replies
// ──────────────────────────────────────────────────────────────────────────
const sendResponseMessage = async (phone, isConfirmed, orderId, buyerName) => {
    try {
        const firstName = buyerName?.split(' ')[0] || 'there';

        const message = isConfirmed
            ? [
                `🎉 Awesome, ${firstName}!`,
                ``,
                `Your order *#${orderId}* is confirmed! ✅`,
                ``,
                `We're packing it up now — you'll get updates here as it moves to shipping.`,
                ``,
                `Need anything? Just reply to this chat. Thanks for shopping with Rozare! 💙`,
            ].join('\n')
            : [
                `Got it, ${firstName}! 👍`,
                ``,
                `Order *#${orderId}* has been cancelled. ❌`,
                ``,
                `No problem at all — nothing is charged, and your cart is still saved if you change your mind.`,
                ``,
                `Hope to see you again soon! 💙  — Rozare`,
            ].join('\n');

        await evolution.sendText(phone, message);
        console.log(`[whatsapp] Sent ${isConfirmed ? 'confirmation' : 'cancellation'} reply to ${phone}`);
    } catch (err) {
        console.error('[whatsapp] Failed to send response message:', err.message);
    }
};

const sendLockedMessage = async (phone, orderId, buyerName) => {
    try {
        const firstName = buyerName?.split(' ')[0] || 'there';
        const msg = [
            `Hey ${firstName}! 👋`,
            ``,
            `Your decision for order *#${orderId}* is now locked. 🔒`,
            ``,
            `Need help? Contact our support team and they'll sort it out for you. 💙`,
        ].join('\n');
        await evolution.sendText(phone, msg);
    } catch (err) {
        console.error('[whatsapp] Failed to send locked message:', err.message);
    }
};

const sendUnclearReplyHint = async (phone, orderId, buyerName) => {
    try {
        const firstName = buyerName?.split(' ')[0] || 'there';
        const msg = [
            `Hi ${firstName} 👋`,
            ``,
            `I didn't quite catch that for order *#${orderId}*.`,
            ``,
            `Please reply with just:`,
            `   *✅ YES* — to confirm`,
            `   *❌ NO*  — to cancel`,
        ].join('\n');
        await evolution.sendText(phone, msg);
    } catch (err) {
        console.error('[whatsapp] Failed to send unclear-reply hint:', err.message);
    }
};

// ──────────────────────────────────────────────────────────────────────────
// Seller side-effects
// ──────────────────────────────────────────────────────────────────────────
const notifySellers = async (order, isConfirmed) => {
    try {
        const productIds = order.orderItems.map(i => i.productId);
        const products = await Product.find({ _id: { $in: productIds } });
        const sellerIds = [...new Set(products.map(p => p.seller?.toString()).filter(Boolean))];
        const buyerName = order.shippingInfo?.fullName || 'A buyer';

        for (const sellerId of sellerIds) {
            const seller = await User.findById(sellerId);

            // 1. Email (confirmation only — we don't spam sellers on cancel emails)
            if (isConfirmed && seller?.email) {
                const data = sellerOrderConfirmedByBuyerEmail(order, seller.username);
                sendEmail({ to: seller.email, ...data }).catch(e =>
                    console.error('[whatsapp] seller confirm email failed:', e.message)
                );
            }

            // 2. Expo push (both confirm + cancel)
            sendPushToUser(sellerId, {
                title: isConfirmed
                    ? 'Buyer confirmed via WhatsApp ✅'
                    : 'Buyer cancelled via WhatsApp ❌',
                body: isConfirmed
                    ? `${buyerName} confirmed order ${order.orderId} through Rozare WhatsApp.`
                    : `${buyerName} cancelled order ${order.orderId} through Rozare WhatsApp.`,
                channelId: 'seller',
                data: {
                    type: isConfirmed ? 'order_confirmed_by_buyer' : 'order_cancelled_by_buyer',
                    orderId: order.orderId,
                    orderObjectId: order._id?.toString(),
                    via: 'whatsapp',
                },
            }).catch(e => console.error('[whatsapp] seller push failed:', e.message));

            // 3. Persistent in-app Notification (the bell in the dashboard)
            Notification.create({
                user: sellerId,
                title: isConfirmed
                    ? 'Order confirmed via WhatsApp'
                    : 'Order cancelled via WhatsApp',
                body: isConfirmed
                    ? `${buyerName} confirmed order #${order.orderId} through Rozare WhatsApp automation.`
                    : `${buyerName} cancelled order #${order.orderId} through Rozare WhatsApp automation.`,
                category: 'order',
                linkTo: `/seller/orders/${order._id}`,
                source: 'system',
            }).catch(e => console.error('[whatsapp] seller in-app notification failed:', e.message));
        }
    } catch (err) {
        console.error('[whatsapp] notifySellers failed:', err.message);
    }
};

// ──────────────────────────────────────────────────────────────────────────
// Message parsing helpers
// ──────────────────────────────────────────────────────────────────────────

// Pull the raw text out of a Baileys message envelope, ignoring our own
// outgoing messages (fromMe === true).
const extractReplyText = (msg) => {
    if (!msg || typeof msg !== 'object') return null;
    // Skip messages we sent
    if (msg?.key?.fromMe) return null;

    const m = msg.message || {};
    // Plain text ("conversation") or extended text with quoted context
    const text =
        m.conversation ||
        m.extendedTextMessage?.text ||
        // Interactive button reply (in case Meta ever re-enables them)
        m.buttonsResponseMessage?.selectedDisplayText ||
        m.buttonsResponseMessage?.selectedButtonId ||
        m.templateButtonReplyMessage?.selectedDisplayText ||
        // List reply
        m.listResponseMessage?.title ||
        // Poll vote (legacy — still handled if any old polls are out in the wild)
        m.pollUpdateMessage ? null : null; // poll parsed separately below

    if (typeof text === 'string' && text.trim()) return text.trim();
    return null;
};

// Legacy poll vote extraction — kept so old polls in flight still finalise.
const extractPollVote = (msg) => {
    const m = msg?.message || {};
    const upd = m.pollUpdateMessage || m.pollVoteMessage || msg?.pollUpdateMessage;
    if (!upd) return null;
    const indexes = upd?.vote?.selectedOptionIndexes || upd?.selectedOptionIndexes;
    const selected = upd?.vote?.selectedOptions || upd?.selectedOptions || upd?.options || [];

    let optionIndex = null;
    if (Array.isArray(indexes) && indexes.length > 0) optionIndex = Number(indexes[0]);
    else if (Array.isArray(selected) && selected.length > 0) optionIndex = 0;

    if (optionIndex === null) return null;
    return optionIndex === 0 ? 'yes' : 'no';
};

// Extract the buyer phone digits from a Baileys key.remoteJid like
// "923028588506@s.whatsapp.net" → "923028588506"
const phoneFromJid = (jid) => {
    if (!jid || typeof jid !== 'string') return '';
    const at = jid.indexOf('@');
    const raw = at > 0 ? jid.slice(0, at) : jid;
    return raw.replace(/[^\d]/g, '');
};

// ──────────────────────────────────────────────────────────────────────────
// Main webhook entry
// ──────────────────────────────────────────────────────────────────────────
exports.handleEvolutionWebhook = async (req, res) => {
    try {
        // Optional shared-secret check
        const expected = process.env.EVOLUTION_WEBHOOK_SECRET;
        if (expected) {
            const got = req.headers['x-rozare-webhook-secret'] || req.headers['apikey'];
            if (got !== expected && got !== process.env.EVOLUTION_API_KEY) {
                return res.status(401).json({ msg: 'Unauthorized webhook' });
            }
        }

        const body = req.body || {};
        const event = body.event || body.eventName || '';

        // ── CONNECTION_UPDATE — keep WhatsAppConfig in sync ──
        if (event === 'connection.update' || event === 'CONNECTION_UPDATE') {
            const state = body.data?.state || body.state;
            const cfg = await WhatsAppConfig.findOneAndUpdate(
                { singletonKey: 'main' },
                {
                    $set: {
                        status: state === 'open' ? 'connected'
                            : state === 'connecting' ? 'connecting'
                            : 'disconnected',
                        lastSeen: new Date(),
                        ...(body.data?.wuid || body.data?.number
                            ? { linkedNumber: `+${(body.data.wuid || body.data.number).split('@')[0]}` }
                            : {}),
                        ...(state === 'open' ? { linkedAt: new Date(), lastError: '' } : {}),
                    },
                },
                { upsert: true, new: true }
            );
            return res.status(200).json({ ok: true, status: cfg.status });
        }

        // ── MESSAGES_UPSERT — look for text YES/NO replies (+ legacy poll votes) ──
        if (event === 'messages.upsert' || event === 'MESSAGES_UPSERT') {
            const messages = Array.isArray(body.data) ? body.data : [body.data].filter(Boolean);

            for (const msg of messages) {
                // Never process messages we sent
                if (msg?.key?.fromMe) continue;

                const remoteJid = msg?.key?.remoteJid || msg?.remoteJid || '';
                const phone = phoneFromJid(remoteJid);
                if (!phone) continue;

                // 1) Prefer plain-text reply (YES/NO etc.)
                let decision = null; // 'yes' | 'no' | null
                const replyText = extractReplyText(msg);
                if (replyText) {
                    decision = parseConfirmReply(replyText);
                }

                // 2) Fall back to legacy poll vote if no clear text decision
                if (!decision) {
                    const pollVote = extractPollVote(msg);
                    if (pollVote) decision = pollVote;
                }

                // Match the sent job by phone (new flow) — short-circuits if
                // there's no pending confirmation waiting for this buyer.
                const job = await markVotedByPhone(phone, decision || 'yes');
                if (!job) continue;

                // If text reply existed but we couldn't classify it as yes/no,
                // send a gentle hint so the buyer knows what to type.
                if (!decision && replyText) {
                    await sendUnclearReplyHint(phone, job.orderId, job.buyerName);
                    continue;
                }
                if (!decision) continue; // no reply text, no poll — ignore

                const isYes = decision === 'yes';
                const order = await Order.findById(job.order);
                if (!order) continue;

                // ── Vote-change & duplicate handling (unchanged from poll flow) ──
                const alreadyConfirmed = !!order.confirmation?.confirmedAt;
                const alreadyDeclined = !!order.confirmation?.declinedAt;

                if (!order.confirmation.voteChangeCount) {
                    order.confirmation.voteChangeCount = 0;
                }
                const MAX_VOTE_CHANGES = 1;

                // User is changing their decision
                if ((alreadyConfirmed && !isYes) || (alreadyDeclined && isYes)) {
                    if (order.confirmation.voteChangeCount >= MAX_VOTE_CHANGES) {
                        console.log(`[whatsapp] Vote-change limit reached for order ${order.orderId}. Blocking.`);
                        if (!order.confirmation.lockMessageSent) {
                            await sendLockedMessage(phone, order.orderId, order.shippingInfo?.fullName);
                            order.confirmation.lockMessageSent = true;
                            await order.save();
                        }
                        continue;
                    }
                    console.log(`[whatsapp] Vote change #${order.confirmation.voteChangeCount + 1} for order ${order.orderId}: ${isYes ? 'confirm' : 'cancel'}`);
                    order.confirmation.voteChangeCount += 1;
                    order.confirmation.confirmedAt = null;
                    order.confirmation.declinedAt = null;
                }

                // Duplicate (same decision again)
                if ((alreadyConfirmed && isYes) || (alreadyDeclined && !isYes)) {
                    console.log(`[whatsapp] Duplicate decision ignored for order ${order.orderId}`);
                    continue;
                }

                // ── Apply decision ──
                if (isYes) {
                    order.confirmation.confirmedAt = new Date();
                    order.confirmation.confirmedVia = 'whatsapp';
                    order.orderStatus = 'confirmed';
                    await order.save();
                    await sendResponseMessage(phone, true, order.orderId, order.shippingInfo?.fullName);
                    notifySellers(order, true);
                } else {
                    order.confirmation.declinedAt = new Date();
                    order.confirmation.confirmedVia = 'whatsapp';
                    order.orderStatus = 'cancelled';
                    await order.save();
                    await sendResponseMessage(phone, false, order.orderId, order.shippingInfo?.fullName);
                    notifySellers(order, false);
                }
            }
            return res.status(200).json({ ok: true });
        }

        // Unknown event — ack so Evolution doesn't retry
        return res.status(200).json({ ok: true, ignored: event });
    } catch (err) {
        console.error('[whatsapp] webhook handler error:', err.message);
        return res.status(200).json({ ok: false, error: err.message });
    }
};
