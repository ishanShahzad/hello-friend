// Builds the human-readable order summary text sent before the poll.

const formatMoney = (n) => {
    const v = Number(n || 0);
    return `USD ${v.toFixed(2)}`;
};

exports.buildOrderSummaryText = (order) => {
    const buyerName = order.shippingInfo?.fullName || 'there';
    const lines = (order.orderItems || []).map((it) => {
        const subtotal = (it.price || 0) * (it.quantity || 0);
        return `• ${it.name} × ${it.quantity} — ${formatMoney(subtotal)}`;
    });

    return [
        `Hi ${buyerName}, this is *Rozare* 👋`,
        ``,
        `We received your order *#${order.orderId}*. Please review and confirm:`,
        ``,
        ...lines,
        ``,
        `*Total: ${formatMoney(order.orderSummary?.totalAmount)}*`,
        `Shipping to: ${order.shippingInfo?.address || ''}, ${order.shippingInfo?.city || ''}`,
        ``,
        `A confirmation poll will follow. Tap *Yes* to confirm or *No* to cancel.`,
    ].join('\n');
};

exports.buildPollPayload = (order) => ({
    name: `Confirm order #${order.orderId}?`,
    selectableCount: 1,
    values: ['✅ Yes, confirm', '❌ No, cancel'],
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
