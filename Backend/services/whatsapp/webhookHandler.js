// Parses Evolution API webhook events (MESSAGES_UPSERT for poll votes,
// CONNECTION_UPDATE for status changes) and triggers order confirmation.

const Order = require('../../models/Order');
const Product = require('../../models/Product');
const User = require('../../models/User');
const WhatsAppConfig = require('../../models/WhatsAppConfig');
const { sendEmail } = require('../../controllers/mailController');
const { sellerOrderConfirmedByBuyerEmail } = require('../../utils/emailTemplates');
const { sendPushToUser } = require('../../utils/expoPush');
const { markVoted } = require('./queue');

// Run the existing seller-notification side-effects after auto-confirm
const notifySellersOfConfirmation = async (order) => {
    try {
        const productIds = order.orderItems.map(i => i.productId);
        const products = await Product.find({ _id: { $in: productIds } });
        const sellerIds = [...new Set(products.map(p => p.seller?.toString()).filter(Boolean))];
        const buyerName = order.shippingInfo?.fullName || 'A buyer';

        for (const sellerId of sellerIds) {
            const seller = await User.findById(sellerId);
            if (seller?.email) {
                const data = sellerOrderConfirmedByBuyerEmail(order, seller.username);
                sendEmail({ to: seller.email, ...data }).catch(e =>
                    console.error('[whatsapp] seller confirm email failed:', e.message)
                );
            }
            sendPushToUser(sellerId, {
                title: 'Buyer confirmed via WhatsApp',
                body: `${buyerName} confirmed order ${order.orderId} via Rozare WhatsApp.`,
                channelId: 'seller',
                data: {
                    type: 'order_confirmed_by_buyer',
                    orderId: order.orderId,
                    orderObjectId: order._id?.toString(),
                    via: 'whatsapp',
                },
            }).catch(e => console.error('[whatsapp] seller push failed:', e.message));
        }
    } catch (err) {
        console.error('[whatsapp] notify sellers failed:', err.message);
    }
};

// Heuristic: detect if a message is a poll-vote update
const extractPollVote = (msg) => {
    // Evolution shapes vary; we look for pollUpdateMessage or poll vote info
    const m = msg?.message || {};
    const upd = m.pollUpdateMessage || m.pollVoteMessage || msg?.pollUpdateMessage;
    if (!upd) return null;

    const targetKey = upd?.pollCreationMessageKey?.id || upd?.pollCreationMessageId || upd?.pollId;
    // Selected option index — usually array of selected option hashes; we just need 1 vs 0
    const selected = upd?.vote?.selectedOptions || upd?.selectedOptions || upd?.options || [];
    const indexes = upd?.vote?.selectedOptionIndexes || upd?.selectedOptionIndexes;

    let optionIndex = null;
    if (Array.isArray(indexes) && indexes.length > 0) optionIndex = Number(indexes[0]);
    else if (Array.isArray(selected) && selected.length > 0) optionIndex = 0; // first option = Yes

    return targetKey ? { pollMessageId: targetKey, optionIndex } : null;
};

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

        // CONNECTION_UPDATE — keep WhatsAppConfig in sync
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

        // MESSAGES_UPSERT — look for poll votes
        if (event === 'messages.upsert' || event === 'MESSAGES_UPSERT') {
            const messages = Array.isArray(body.data) ? body.data : [body.data].filter(Boolean);
            for (const msg of messages) {
                const vote = extractPollVote(msg);
                if (!vote) continue;

                const isYes = vote.optionIndex === 0; // first option = "Yes, confirm"
                const job = await markVoted(vote.pollMessageId, isYes ? 'yes' : 'no');
                if (!job) continue;

                const order = await Order.findById(job.order);
                if (!order) continue;

                // Skip if already finalized via another channel
                if (order.confirmation?.confirmedAt || order.confirmation?.declinedAt) continue;

                if (isYes) {
                    order.confirmation.confirmedAt = new Date();
                    order.confirmation.confirmedVia = 'whatsapp';
                    order.orderStatus = 'confirmed';
                    await order.save();
                    notifySellersOfConfirmation(order);
                } else {
                    order.confirmation.declinedAt = new Date();
                    order.confirmation.confirmedVia = 'whatsapp';
                    order.orderStatus = 'cancelled';
                    await order.save();
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
