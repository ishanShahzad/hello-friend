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
const { findPendingJobByPhone, applyVote } = require('./queue');
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

const sendLockedMessage = async (phone, orderId, buyerName, prevDecision = '') => {
    try {
        const firstName = buyerName?.split(' ')[0] || 'there';
        // prevDecision is 'confirmed' | 'cancelled' | '' — describe the
        // locked-in state to the buyer so they know why tapping the other
        // button seems to do nothing.
        const prevLine = prevDecision === 'confirmed'
            ? `You already *confirmed* this order — we're processing it now. ✅`
            : prevDecision === 'cancelled'
                ? `You already *cancelled* this order. ❌`
                : `Your decision for order *#${orderId}* is now locked. 🔒`;

        const msg = [
            `Hey ${firstName}! 👋`,
            ``,
            prevLine,
            ``,
            `Need to change something? Please contact our support team — they'll sort it out for you. 💙`,
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

// ──────────────────────────────────────────────────────────────────────────
// Decision extraction — looks at a Baileys message envelope and returns
// one of:
//   { source: 'button', decision: 'yes'|'no', rawId: '...' }
//   { source: 'text',   text: '...' }
//   null
//
// Sources we handle (in priority order):
//   1. Native-flow / interactive button click (v2.3.7 "viewOnceMessage →
//      interactiveResponseMessage → nativeFlowResponseMessage"):
//         msg.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson
//         → { id: "confirm_ORD-xxx", ... }
//   2. Classic buttonsResponseMessage (older WA clients):
//         msg.message.buttonsResponseMessage.selectedButtonId
//   3. Template button reply (template flow):
//         msg.message.templateButtonReplyMessage.selectedId
//   4. List reply (in case we ever switch):
//         msg.message.listResponseMessage.singleSelectReply.selectedRowId
//   5. Plain text:
//         msg.message.conversation  or  msg.message.extendedTextMessage.text
//      Some WA clients reflect a tapped button as plain text = displayText,
//      so text fallback catches that too via parseConfirmReply.
// ──────────────────────────────────────────────────────────────────────────

const { parseButtonId } = require('./messageBuilder');

const extractDecision = (msg) => {
    if (!msg || typeof msg !== 'object') return null;
    // Skip our own outgoing messages
    if (msg?.key?.fromMe) return null;

    const m = msg.message || {};

    // ── 1. Native-flow interactive response (v2.3.7 shape) ───────────
    // Evolution wraps the payload; the actual id is in
    // interactiveResponseMessage.nativeFlowResponseMessage.paramsJson
    // (a JSON-stringified object with `.id`).
    const interactive =
        m.interactiveResponseMessage ||
        m.viewOnceMessage?.message?.interactiveResponseMessage ||
        m.ephemeralMessage?.message?.interactiveResponseMessage;
    if (interactive) {
        const nf = interactive.nativeFlowResponseMessage || interactive.body;
        const paramsJson = nf?.paramsJson;
        if (paramsJson) {
            try {
                const parsed = JSON.parse(paramsJson);
                // paramsJson shape varies by client — look at all likely fields
                const btnId = parsed?.id || parsed?.button_id || parsed?.buttonId;
                const decision = parseButtonId(btnId);
                if (decision) return { source: 'button', decision, rawId: btnId };
            } catch { /* malformed — fall through */ }
        }
        // Some builds include `name: 'quick_reply'` alongside a top-level id
        const directId = interactive?.id || interactive?.buttonId;
        const decision = parseButtonId(directId);
        if (decision) return { source: 'button', decision, rawId: directId };
    }

    // ── 2. Classic buttonsResponseMessage ─────────────────────────────
    const btnResp = m.buttonsResponseMessage;
    if (btnResp) {
        const id = btnResp.selectedButtonId;
        const decision = parseButtonId(id);
        if (decision) return { source: 'button', decision, rawId: id };
        // Fall back to the display text if the id doesn't match our prefixes
        const display = btnResp.selectedDisplayText;
        if (display) return { source: 'text', text: display };
    }

    // ── 3. Template button reply ──────────────────────────────────────
    const tpl = m.templateButtonReplyMessage;
    if (tpl) {
        const id = tpl.selectedId;
        const decision = parseButtonId(id);
        if (decision) return { source: 'button', decision, rawId: id };
        const display = tpl.selectedDisplayText;
        if (display) return { source: 'text', text: display };
    }

    // ── 4. List reply ──────────────────────────────────────────────────
    const list = m.listResponseMessage;
    if (list) {
        const id = list.singleSelectReply?.selectedRowId || list.rowId;
        const decision = parseButtonId(id);
        if (decision) return { source: 'button', decision, rawId: id };
        const title = list.title;
        if (title) return { source: 'text', text: title };
    }

    // ── 5. Plain text (conversation / extendedTextMessage) ────────────
    const text = m.conversation || m.extendedTextMessage?.text;
    if (typeof text === 'string' && text.trim()) {
        return { source: 'text', text: text.trim() };
    }

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

        // ── MESSAGES_UPSERT — button click OR text YES/NO reply (+ legacy poll) ──
        if (event === 'messages.upsert' || event === 'MESSAGES_UPSERT') {
            const messages = Array.isArray(body.data) ? body.data : [body.data].filter(Boolean);

            for (const msg of messages) {
                // Never process messages we sent
                if (msg?.key?.fromMe) continue;

                const remoteJid = msg?.key?.remoteJid || msg?.remoteJid || '';
                const phone = phoneFromJid(remoteJid);
                if (!phone) continue;

                // 1) Try the rich extractor — recognises button clicks and text
                //    replies in any of the 5 WhatsApp payload shapes.
                let decision = null;   // 'yes' | 'no' | null
                let decisionSource = ''; // 'button' | 'text' | 'poll'
                let replyTextForHint = '';

                const extracted = extractDecision(msg);
                if (extracted) {
                    if (extracted.source === 'button') {
                        decision = extracted.decision;
                        decisionSource = 'button';
                        console.log(`[whatsapp] Button click from ${phone}: ${extracted.rawId} → ${decision}`);
                    } else if (extracted.source === 'text') {
                        replyTextForHint = extracted.text;
                        decision = parseConfirmReply(extracted.text);
                        if (decision) {
                            decisionSource = 'text';
                            console.log(`[whatsapp] Text reply from ${phone}: "${extracted.text}" → ${decision}`);
                        }
                    }
                }

                // 2) Legacy poll vote — kept so any old in-flight polls resolve
                if (!decision) {
                    const pollVote = extractPollVote(msg);
                    if (pollVote) { decision = pollVote; decisionSource = 'poll'; }
                }

                // Find the pending job for this buyer WITHOUT changing it.
                // We'll only persist the vote AFTER confirming the order guard
                // allows the decision. This prevents the admin dashboard from
                // showing "declined" when the buyer tapped NO after already
                // confirming (the old code wrote the flip, then blocked the
                // order update — leaving the job and order out of sync).
                const job = await findPendingJobByPhone(phone);
                if (!job) continue;

                // If the buyer sent *something* but we couldn't decide, nudge them.
                if (!decision && replyTextForHint) {
                    await sendUnclearReplyHint(phone, job.orderId, job.buyerName);
                    continue;
                }
                if (!decision) continue; // silent message with no useful content

                const isYes = decision === 'yes';
                const order = await Order.findById(job.order);
                if (!order) continue;

                // ── Once the buyer decides, that decision is FINAL. ──
                //
                // WhatsApp's UI greys out the button the buyer just tapped,
                // but the OTHER button stays active (standard WA client
                // behavior — we can't change that). So a buyer could still
                // tap the opposite button after deciding. This guard stops
                // the second tap from flipping the order.
                //
                // The buyer gets a friendly "your decision is already
                // locked" reply ONCE (we track lockMessageSent so we don't
                // spam them if they keep tapping).
                const alreadyConfirmed = !!order.confirmation?.confirmedAt;
                const alreadyDeclined  = !!order.confirmation?.declinedAt;
                const alreadyDecided   = alreadyConfirmed || alreadyDeclined;

                if (alreadyDecided) {
                    // Same decision again → silently ignore (happens if WA
                    // re-delivers the same event, or buyer retypes 'yes').
                    if ((alreadyConfirmed && isYes) || (alreadyDeclined && !isYes)) {
                        console.log(`[whatsapp] Duplicate ${isYes ? 'yes' : 'no'} for order ${order.orderId} — ignored`);
                        continue;
                    }

                    // Different decision (flip attempt) → BLOCK.
                    const prevDecision = alreadyConfirmed ? 'confirmed' : 'cancelled';
                    const newDecision  = isYes ? 'confirm' : 'cancel';
                    console.log(
                        `[whatsapp] Order ${order.orderId} already ${prevDecision}; blocking flip to ${newDecision}`
                    );

                    // Send the "decision locked" reminder once — the
                    // buyer's WhatsApp won't visually disable the second
                    // button, but at least they'll understand why tapping
                    // it does nothing.
                    if (!order.confirmation.lockMessageSent) {
                        await sendLockedMessage(
                            phone,
                            order.orderId,
                            order.shippingInfo?.fullName,
                            prevDecision,
                        );
                        order.confirmation.lockMessageSent = true;
                        await order.save();
                    }
                    continue;
                }

                // ── First decision — apply it ──
                if (isYes) {
                    order.confirmation.confirmedAt = new Date();
                    order.confirmation.confirmedVia = 'whatsapp';
                    order.orderStatus = 'confirmed';
                    await order.save();
                    // NOW persist the vote on the job (dashboard reads this)
                    await applyVote(job, 'yes');
                    await sendResponseMessage(phone, true, order.orderId, order.shippingInfo?.fullName);
                    notifySellers(order, true);
                } else {
                    order.confirmation.declinedAt = new Date();
                    order.confirmation.confirmedVia = 'whatsapp';
                    order.orderStatus = 'cancelled';
                    await order.save();
                    // NOW persist the vote on the job (dashboard reads this)
                    await applyVote(job, 'no');
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
