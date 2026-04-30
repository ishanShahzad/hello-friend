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

// Default country code for numbers entered without one (e.g. "03028588506").
// Configurable via env so this works in any country. Keep "92" (Pakistan)
// as the fallback because Rozare's primary market is PK.
const DEFAULT_COUNTRY_CODE = String(process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '92')
    .replace(/[^\d]/g, '') || '92';

// Normalize phone to digits-only E.164-style (Evolution API expects "923001234567").
//
// Rules:
//   1. Strip every non-digit character, keep a leading "+" as an explicit int'l marker.
//   2. If the original started with "+" or "00" → it's already international; just use the digits.
//   3. Otherwise strip leading zeros (domestic-trunk prefix) then prepend DEFAULT_COUNTRY_CODE
//      if the remainder is too short to already contain a country code.
//
// This matches the Frontend's sanitizePhone() behaviour so the manual wa.me button
// and the automated poll use the same normalized number.
exports.normalizePhone = (raw) => {
    if (!raw) return '';
    let p = String(raw).trim();

    // Detect "already international" BEFORE we strip symbols
    const hadPlus = p.startsWith('+');
    const hadDoubleZero = /^00\d/.test(p); // "0092300..." → international via 00 prefix

    // Keep digits only
    p = p.replace(/[^\d]/g, '');
    if (!p) return '';

    if (hadPlus) {
        // Already E.164 — just return the digits
        return p;
    }

    if (hadDoubleZero) {
        // "00" + country code + number → drop the "00"
        return p.replace(/^00/, '');
    }

    // Domestic format: strip leading zero(s), then add country code
    p = p.replace(/^0+/, '');

    // If the number is short enough that it can't already contain a country code,
    // prepend the default. A Pakistani mobile is 10 digits (3XXXXXXXXX after
    // stripping the leading 0), so <=10 means "no country code yet".
    if (p.length > 0 && p.length <= 10) {
        p = DEFAULT_COUNTRY_CODE + p;
    }

    return p;
};
