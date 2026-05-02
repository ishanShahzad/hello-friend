// Builds the WhatsApp message we send to the buyer to confirm an order.
//
// Flow (button-first, text-safe fallback):
//   1. Send an interactive "native flow" message with 2 reply buttons:
//        [✅ Confirm order]   [❌ Cancel order]
//      Each button carries a stable id of the form
//        confirm_ORD-xxxxxxxxx     or     cancel_ORD-xxxxxxxxx
//      so the webhook can detect the buyer's choice unambiguously — even
//      if the button chips fail to render and the buyer types "yes" / "no"
//      or anything else in their own words.
//
//   2. When the tap comes back, WhatsApp may deliver it as any of:
//        - buttonsResponseMessage.selectedButtonId  (older clients)
//        - interactiveResponseMessage               (v2 native flow)
//        - templateButtonReplyMessage               (template flow)
//        - plain conversation text  (modern WA reflects the displayText
//                                    as a regular message from the buyer)
//      All four paths are handled in webhookHandler.extractReplyText.
//
//   3. If Evolution can't render buttons for a specific phone (very rare in
//      practice, but possible on outdated clients), the underlying text is
//      still human-readable — "Please tap a button OR reply YES / NO" — so
//      no buyer is ever stuck.

const formatMoney = (n) => {
    const v = Number(n || 0);
    return `USD ${v.toFixed(2)}`;
};

// ──────────────────────────────────────────────────────────────────────────
// Button ids — MUST start with these prefixes. Webhook handler uses the
// prefix to classify the click, and the suffix (orderId) to double-check
// we're reacting to the right order.
// ──────────────────────────────────────────────────────────────────────────
const CONFIRM_BTN_PREFIX = 'confirm_';
const CANCEL_BTN_PREFIX  = 'cancel_';

exports.buildConfirmButtonId = (orderId) => `${CONFIRM_BTN_PREFIX}${orderId}`;
exports.buildCancelButtonId  = (orderId) => `${CANCEL_BTN_PREFIX}${orderId}`;

exports.CONFIRM_BTN_PREFIX = CONFIRM_BTN_PREFIX;
exports.CANCEL_BTN_PREFIX  = CANCEL_BTN_PREFIX;

// ──────────────────────────────────────────────────────────────────────────
// Outgoing — interactive buttons payload (primary) + plain text body that
// sits above the buttons and provides a full fallback.
// ──────────────────────────────────────────────────────────────────────────

exports.buildOrderButtonsPayload = (order) => {
    const buyerName = order.shippingInfo?.fullName?.split(' ')[0] || 'there';
    const itemCount = order.orderItems?.length || 0;
    const total = formatMoney(order.orderSummary?.totalAmount);
    const city = order.shippingInfo?.city || 'your location';

    // Build product list
    const productLines = (order.orderItems || []).map(it => {
        const qty = it.quantity || 1;
        const price = formatMoney(it.price * qty);
        return `• ${it.name} x${qty} — ${price}`;
    }).slice(0, 5); // Max 5 items to keep message short
    if (itemCount > 5) productLines.push(`  _...and ${itemCount - 5} more item${itemCount - 5 > 1 ? 's' : ''}_`);

    return {
        title: `Rozare — Order #${order.orderId}`,
        description: [
            `Hey ${buyerName}! 👋`,
            ``,
            `Thanks for your order with Rozare! 🎉`,
            ``,
            ...productLines,
            ``,
            `💰 Total: *${total}*`,
            `📍 Shipping to ${city}`,
            ``,
            `Please tap a button below to confirm or cancel.`,
        ].join('\n'),
        footer: `Rozare order confirmation · You can also reply YES or NO`,
        buttons: [
            {
                type: 'reply',
                displayText: '✅ Confirm order',
                id: exports.buildConfirmButtonId(order.orderId),
            },
            {
                type: 'reply',
                displayText: '❌ Cancel order',
                id: exports.buildCancelButtonId(order.orderId),
            },
        ],
    };
};

// ──────────────────────────────────────────────────────────────────────────
// Build a LIST-message payload for the buyer. This is the reliable path
// that actually renders on WhatsApp today — uses the legacy SINGLE_SELECT
// listType (Evolution's `sendList`, fixed in the homolog/develop build).
// ──────────────────────────────────────────────────────────────────────────
exports.buildOrderListPayload = (order) => {
    const buyerName = order.shippingInfo?.fullName?.split(' ')[0] || 'there';
    const itemCount = order.orderItems?.length || 0;
    const total = formatMoney(order.orderSummary?.totalAmount);
    const city = order.shippingInfo?.city || 'your location';

    const productLines = (order.orderItems || []).map(it => {
        const qty = it.quantity || 1;
        const price = formatMoney(it.price * qty);
        return `• ${it.name} x${qty} — ${price}`;
    }).slice(0, 5);
    if (itemCount > 5) productLines.push(`  _...and ${itemCount - 5} more_`);

    return {
        title: `Rozare — Order #${order.orderId}`,
        description: [
            `Hey ${buyerName}! 👋`,
            ``,
            `Thanks for your order with Rozare! 🎉`,
            ``,
            ...productLines,
            ``,
            `💰 Total: *${total}*`,
            `📍 Shipping to ${city}`,
            ``,
            `Tap the button below to confirm or cancel your order.`,
        ].join('\n'),
        buttonText: 'Confirm or Cancel',
        footerText: 'Rozare order confirmation · or reply YES / NO',
        sections: [{
            title: 'Your decision',
            rows: [
                {
                    title: '✅ Confirm order',
                    description: 'Start processing right away',
                    rowId: exports.buildConfirmButtonId(order.orderId),
                },
                {
                    title: '❌ Cancel order',
                    description: 'Nothing will be charged',
                    rowId: exports.buildCancelButtonId(order.orderId),
                },
            ],
        }],
    };
};

// A plain-text fallback used only if sendButtons fails entirely (network
// error etc.) — we still want the buyer to be able to decide.
exports.buildOrderConfirmationMessage = (order) => {
    const buyerName = order.shippingInfo?.fullName?.split(' ')[0] || 'there';
    const itemCount = order.orderItems?.length || 0;
    const total = formatMoney(order.orderSummary?.totalAmount);
    const city = order.shippingInfo?.city || 'your location';

    const productLines = (order.orderItems || []).map(it => {
        const qty = it.quantity || 1;
        const price = formatMoney(it.price * qty);
        return `• ${it.name} x${qty} — ${price}`;
    }).slice(0, 5);
    if (itemCount > 5) productLines.push(`  _...and ${itemCount - 5} more_`);

    return [
        `Hey ${buyerName}! 👋`,
        ``,
        `Thanks for your order with Rozare! 🎉`,
        ``,
        `📦 *Order #${order.orderId}*`,
        ``,
        ...productLines,
        ``,
        `💰 Total: *${total}*`,
        `📍 Shipping to ${city}`,
        ``,
        `Please confirm your order by replying:`,
        ``,
        `   *✅ YES*  — to confirm & start processing`,
        `   *❌ NO*   — to cancel this order`,
    ].join('\n');
};

// ──────────────────────────────────────────────────────────────────────────
// Incoming — classify the buyer's reply.
//
// Sources we handle (checked in this order):
//   1. Button click  → extractButtonDecision() below, called from the
//                      webhook handler with the raw Baileys message.
//                      Returns { decision: 'yes'|'no', orderId: 'ORD-xxx' }
//                      or null.
//   2. Text reply    → parseConfirmReply() uses a multilingual YES/NO
//                      dictionary and tolerates emoji/punctuation.
// ──────────────────────────────────────────────────────────────────────────

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
    // Single-digit shortcut
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
    // Single-digit shortcut
    '2',
];

const normaliseReply = (text) =>
    String(text || '')
        .toLowerCase()
        .replace(/\p{Extended_Pictographic}/gu, ' ')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();

exports.parseConfirmReply = (text) => {
    const clean = normaliseReply(text);
    if (!clean) return null;

    const tokens = clean.split(' ');
    const hasYes = tokens.some((t) => YES_WORDS.includes(t));
    const hasNo = tokens.some((t) => NO_WORDS.includes(t));

    if (hasYes && hasNo) {
        for (const t of tokens) {
            if (YES_WORDS.includes(t)) return 'yes';
            if (NO_WORDS.includes(t)) return 'no';
        }
    }
    if (hasYes) return 'yes';
    if (hasNo) return 'no';

    if (/\bconfirm(ing|ed)?\b/.test(clean)) return 'yes';
    if (/\bcancel(ling|led)?\b/.test(clean)) return 'no';

    return null;
};

// Decide yes/no purely from a button id string (e.g. "confirm_ORD-123").
// Returns 'yes' | 'no' | null.
exports.parseButtonId = (id) => {
    if (!id || typeof id !== 'string') return null;
    if (id.startsWith(CONFIRM_BTN_PREFIX)) return 'yes';
    if (id.startsWith(CANCEL_BTN_PREFIX))  return 'no';
    return null;
};

// ──────────────────────────────────────────────────────────────────────────
// Phone normalisation (unchanged)
// ──────────────────────────────────────────────────────────────────────────
const DEFAULT_COUNTRY_CODE = String(process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '92')
    .replace(/[^\d]/g, '') || '92';

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
// Legacy (kept so any caller still referencing it won't break)
// ──────────────────────────────────────────────────────────────────────────
exports.buildOrderSummaryText = exports.buildOrderConfirmationMessage;
exports.buildPollPayload = (order) => ({
    name: `Ready to confirm? 🤔`,
    selectableCount: 1,
    values: ['✅ Yes, confirm my order!', '❌ No, cancel it'],
});
