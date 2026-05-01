// Builds the single WhatsApp message we send to the buyer to confirm an order.
//
// Design notes:
//   - WhatsApp interactive buttons (sendButtons) are broken for standard
//     Baileys clients as of Evolution v2.3.7 (upstream issues #2390, #2404)
//     because Meta no longer delivers them to non-Cloud-API senders.
//   - Polls work, but require 2 separate messages (summary + poll) and
//     reading pollUpdateMessage events is fragile when there's no
//     message-quote linkage.
//   - What actually works reliably today: ONE plain text message with two
//     "suggested reply" tokens (YES / NO, plus forgiving alternates like
//     "1" / "2", "confirm" / "cancel" in multiple languages).
//
// Consumers:
//   - queue.js                  → sends buildOrderConfirmationMessage() once
//   - webhookHandler.js         → parses the buyer's free-text reply with
//                                 parseConfirmReply() below

const formatMoney = (n) => {
    const v = Number(n || 0);
    return `USD ${v.toFixed(2)}`;
};

// ──────────────────────────────────────────────────────────────────────────
// Outgoing: the single confirmation message
// ──────────────────────────────────────────────────────────────────────────
exports.buildOrderConfirmationMessage = (order) => {
    const buyerName = order.shippingInfo?.fullName?.split(' ')[0] || 'there';
    const itemCount = order.orderItems?.length || 0;
    const itemText = itemCount === 1 ? '1 item' : `${itemCount} items`;
    const total = formatMoney(order.orderSummary?.totalAmount);
    const city = order.shippingInfo?.city || 'your location';

    return [
        `Hey ${buyerName}! 👋`,
        ``,
        `Thanks for your order with Rozare! 🎉`,
        ``,
        `📦 *Order #${order.orderId}*`,
        `💰 Total: *${total}* (${itemText})`,
        `📍 Shipping to ${city}`,
        ``,
        `Please confirm your order by replying:`,
        ``,
        `   *✅ YES*  — to confirm & start processing`,
        `   *❌ NO*   — to cancel this order`,
        ``,
        `_(You can also reply with "confirm" or "cancel" — we'll understand.)_`,
    ].join('\n');
};

// ──────────────────────────────────────────────────────────────────────────
// Incoming: parse the buyer's free-text reply
// ──────────────────────────────────────────────────────────────────────────
// Returns: 'yes' | 'no' | null
// Tolerant to emoji, punctuation, capitalisation, and a handful of
// multi-language affirmatives/negatives common in Rozare's markets.
const YES_WORDS = [
    'yes', 'y', 'yeah', 'yep', 'yup', 'yess', 'yesss',
    'ok', 'okay', 'kk',
    'confirm', 'confirmed', 'confirming',
    'done', 'accept', 'accepted', 'approve', 'approved',
    'proceed', 'go', 'alright',
    // Urdu / Roman-Urdu
    'han', 'haan', 'ji', 'jee', 'theek', 'theeq',
    // Arabic (romanised)
    'naam', 'aiwa',
    // Hindi
    'haa', 'haaji',
    // Single digit shortcut
    '1',
];

const NO_WORDS = [
    'no', 'nope', 'nah', 'nay',
    'cancel', 'cancelled', 'cancelling', 'canceled',
    'reject', 'rejected', 'decline', 'declined',
    'stop', 'abort', 'dont', "don't",
    // Urdu / Roman-Urdu
    'nahi', 'nahin', 'nhi', 'mana',
    // Arabic (romanised)
    'la',
    // Single digit shortcut
    '2',
];

// Normalise: strip emoji / punctuation / whitespace, lowercase.
// Using \p{Emoji}/\p{Symbol} unicode property escapes handles every emoji
// including compound sequences without the ASCII-overlap footgun of
// hardcoded code-point ranges.
const normaliseReply = (text) =>
    String(text || '')
        .toLowerCase()
        // Drop emoji & symbols (flag, heart, thumbs-up, etc.)
        .replace(/\p{Extended_Pictographic}/gu, ' ')
        // Collapse remaining punctuation to single spaces, keep letters/digits
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();

exports.parseConfirmReply = (text) => {
    const clean = normaliseReply(text);
    if (!clean) return null;

    // Check every whitespace-separated token so "Yes please" / "Cancel it" both work.
    const tokens = clean.split(' ');

    const hasYes = tokens.some((t) => YES_WORDS.includes(t));
    const hasNo = tokens.some((t) => NO_WORDS.includes(t));

    // If both appear (e.g. "not yes" / "yes no"), the *first* decisive token wins.
    if (hasYes && hasNo) {
        for (const t of tokens) {
            if (YES_WORDS.includes(t)) return 'yes';
            if (NO_WORDS.includes(t)) return 'no';
        }
    }
    if (hasYes) return 'yes';
    if (hasNo) return 'no';

    // Also allow a full-phrase match ("i'd like to confirm", "please cancel this")
    if (/\bconfirm(ing|ed)?\b/.test(clean)) return 'yes';
    if (/\bcancel(ling|led)?\b/.test(clean)) return 'no';

    return null;
};

// Default country code for numbers entered without one (e.g. "03028588506").
const DEFAULT_COUNTRY_CODE = String(process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '92')
    .replace(/[^\d]/g, '') || '92';

// Normalize phone to digits-only E.164-style (Evolution API expects "923001234567").
exports.normalizePhone = (raw) => {
    if (!raw) return '';
    let p = String(raw).trim();

    const hadPlus = p.startsWith('+');
    const hadDoubleZero = /^00\d/.test(p);

    p = p.replace(/[^\d]/g, '');
    if (!p) return '';

    if (hadPlus) return p;
    if (hadDoubleZero) return p.replace(/^00/, '');

    p = p.replace(/^0+/, '');
    if (p.length > 0 && p.length <= 10) p = DEFAULT_COUNTRY_CODE + p;

    return p;
};

// ──────────────────────────────────────────────────────────────────────────
// Legacy exports kept for any code still referring to them (queue.js updated
// separately). These are not used by the new single-message flow.
// ──────────────────────────────────────────────────────────────────────────
exports.buildOrderSummaryText = exports.buildOrderConfirmationMessage;
exports.buildPollPayload = (order) => ({
    name: `Ready to confirm? 🤔`,
    selectableCount: 1,
    values: ['✅ Yes, confirm my order!', '❌ No, cancel it'],
});
