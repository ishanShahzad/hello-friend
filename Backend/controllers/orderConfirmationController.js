const crypto = require('crypto');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { sendEmail } = require('./mailController');
const { sellerOrderConfirmedByBuyerEmail } = require('../utils/emailTemplates');
const { sendPushToUser } = require('../utils/expoPush');

const TOKEN_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

exports.generateConfirmationToken = () => ({
    token: crypto.randomBytes(32).toString('hex'),
    tokenExpiresAt: new Date(Date.now() + TOKEN_TTL_MS),
});

const sanitizeOrderForPublic = (order) => ({
    orderId: order.orderId,
    orderItems: order.orderItems.map(i => ({
        name: i.name, image: i.image, price: i.price, quantity: i.quantity,
        selectedColor: i.selectedColor || null,
    })),
    shippingInfo: {
        fullName: order.shippingInfo.fullName,
        address: order.shippingInfo.address,
        city: order.shippingInfo.city,
        state: order.shippingInfo.state,
        postalCode: order.shippingInfo.postalCode,
        country: order.shippingInfo.country,
    },
    orderSummary: order.orderSummary,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt,
    confirmation: {
        confirmedAt: order.confirmation?.confirmedAt || null,
        confirmedVia: order.confirmation?.confirmedVia || null,
        declinedAt: order.confirmation?.declinedAt || null,
        expired: order.confirmation?.tokenExpiresAt
            ? new Date(order.confirmation.tokenExpiresAt) < new Date()
            : false,
    },
    orderStatus: order.orderStatus,
});

exports.getConfirmationDetails = async (req, res) => {
    const { token } = req.params;
    if (!token || token.length < 32) return res.status(400).json({ msg: 'Invalid token' });
    try {
        const order = await Order.findOne({ 'confirmation.token': token });
        if (!order) return res.status(404).json({ msg: 'Order not found or link expired' });
        return res.status(200).json({ order: sanitizeOrderForPublic(order) });
    } catch (err) {
        console.error('getConfirmationDetails error:', err.message);
        return res.status(500).json({ msg: 'Server error' });
    }
};

exports.confirmOrder = async (req, res) => {
    const { token } = req.params;
    if (!token || token.length < 32) return res.status(400).json({ msg: 'Invalid token' });
    try {
        const order = await Order.findOne({ 'confirmation.token': token });
        if (!order) return res.status(404).json({ msg: 'Order not found' });

        if (order.confirmation?.confirmedAt) {
            return res.status(200).json({ msg: 'Already confirmed', order: sanitizeOrderForPublic(order) });
        }
        if (order.confirmation?.declinedAt) {
            return res.status(409).json({ msg: 'Order was declined' });
        }
        if (order.confirmation?.tokenExpiresAt && new Date(order.confirmation.tokenExpiresAt) < new Date()) {
            return res.status(410).json({ msg: 'Confirmation link expired' });
        }

        order.confirmation.confirmedAt = new Date();
        order.confirmation.confirmedVia = 'email';
        order.orderStatus = 'confirmed';
        await order.save();

        // Notify sellers of the products in this order via email + mobile push
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
                        console.error('seller confirm email failed:', e.message)
                    );
                }
                // Mobile push to seller
                sendPushToUser(sellerId, {
                    title: 'Buyer confirmed an order',
                    body: `${buyerName} confirmed order ${order.orderId} via email — ready to process.`,
                    channelId: 'seller',
                    data: {
                        type: 'order_confirmed_by_buyer',
                        orderId: order.orderId,
                        orderObjectId: order._id?.toString(),
                    },
                }).catch(e => console.error('seller push failed:', e.message));
            }
        } catch (notifyErr) {
            console.error('Failed to notify seller of buyer confirmation:', notifyErr.message);
        }

        return res.status(200).json({ msg: 'Order confirmed', order: sanitizeOrderForPublic(order) });
    } catch (err) {
        console.error('confirmOrder error:', err.message);
        return res.status(500).json({ msg: 'Server error' });
    }
};

exports.declineOrder = async (req, res) => {
    const { token } = req.params;
    if (!token || token.length < 32) return res.status(400).json({ msg: 'Invalid token' });
    try {
        const order = await Order.findOne({ 'confirmation.token': token });
        if (!order) return res.status(404).json({ msg: 'Order not found' });

        if (order.confirmation?.confirmedAt) {
            return res.status(409).json({ msg: 'Order already confirmed' });
        }
        if (order.confirmation?.declinedAt) {
            return res.status(200).json({ msg: 'Already declined', order: sanitizeOrderForPublic(order) });
        }

        order.confirmation.declinedAt = new Date();
        order.orderStatus = 'cancelled';
        await order.save();

        return res.status(200).json({ msg: 'Order declined', order: sanitizeOrderForPublic(order) });
    } catch (err) {
        console.error('declineOrder error:', err.message);
        return res.status(500).json({ msg: 'Server error' });
    }
};
