// Builds the human-readable order summary text sent before the poll.

const formatMoney = (n) => {
    const v = Number(n || 0);
    return `USD ${v.toFixed(2)}`;
};

exports.buildOrderSummaryText = (order) => {
    const buyerName = order.shippingInfo?.fullName?.split(' ')[0] || 'there';
    const itemCount = order.orderItems?.length || 0;
    const itemText = itemCount === 1 ? '1 item' : `${itemCount} items`;

    return [
        `Hey ${buyerName}! 👋`,
        ``,
        `Thanks for your order! 🎉`,
        ``,
        `📦 *Order #${order.orderId}*`,
        `💰 Total: *${formatMoney(order.orderSummary?.totalAmount)}* (${itemText})`,
        `📍 ${order.shippingInfo?.city || 'Your location'}`,
        ``,
        `Please confirm your order below 👇`,
    ].join('\n');
};

exports.buildPollPayload = (order) => ({
    name: `Ready to confirm? 🤔`,
    selectableCount: 1,
    values: ['✅ Yes, confirm my order!', '❌ No, cancel it'],
});

// Normalize phone to digits-only (Evolution API expects "9230012345678" style)
exports.normalizePhone = (raw) => {
    if (!raw) return '';
    let p = String(raw).trim();
    // Strip everything but digits and leading +
    p = p.replace(/[^\d+]/g, '');
    if (p.startsWith('+')) p = p.slice(1);
    // Drop leading zeros (common typo)
    p = p.replace(/^0+/, '');
    return p;
};
