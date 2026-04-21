/**
 * WhatsApp order verification helper.
 * Generates a wa.me link with a pre-filled verification message.
 */

const DEFAULT_COUNTRY_CODE = '92'; // Pakistan default, matches shippingInfo.country fallback

export const sanitizePhone = (rawPhone) => {
  if (!rawPhone) return '';
  let digits = String(rawPhone).replace(/\D/g, '');
  if (!digits) return '';
  // Strip leading zeros
  digits = digits.replace(/^0+/, '');
  // If the number is short (likely local), prepend default country code
  if (digits.length <= 10) {
    digits = DEFAULT_COUNTRY_CODE + digits;
  }
  return digits;
};

const formatMoney = (n, formatPrice) => {
  if (typeof formatPrice === 'function') {
    try { return formatPrice(n || 0); } catch { /* noop */ }
  }
  return `$${Number(n || 0).toFixed(2)}`;
};

export const buildVerifyMessage = (order, formatPrice) => {
  const fullName = order?.shippingInfo?.fullName || 'Customer';
  const storeName =
    order?.orderItems?.[0]?.product?.store?.storeName ||
    order?.orderItems?.[0]?.store?.storeName ||
    'our store';
  const orderId = order?.orderId || order?._id?.slice(-8)?.toUpperCase() || '';

  const lines = (order?.orderItems || []).map((it) => {
    const name = it?.product?.name || it?.name || 'Item';
    const qty = it?.qty || it?.quantity || 1;
    const price = formatMoney((it?.price || 0) * qty, formatPrice);
    return `• ${name} x${qty} — ${price}`;
  });

  const subtotal = order?.orderSummary?.subtotal || 0;
  const tax = order?.orderSummary?.tax || 0;
  let shipping = order?.orderSummary?.shippingCost || 0;
  if (order?.sellerShipping?.length > 0) {
    shipping = order.sellerShipping.reduce(
      (sum, s) => sum + (s?.shippingMethod?.price || 0),
      0
    );
  }
  const total = order?.orderSummary?.totalAmount || subtotal + tax + shipping;

  return [
    `Hello ${fullName}, this is ${storeName} on Rozare.`,
    '',
    `We're verifying your order #${orderId}:`,
    ...lines,
    '',
    `Total: ${formatMoney(total, formatPrice)}`,
    '',
    'Please reply YES to confirm, or let us know if anything needs to change. Thank you!',
  ].join('\n');
};

export const openWhatsAppVerify = (order, formatPrice) => {
  const phone = sanitizePhone(order?.shippingInfo?.phone);
  if (!phone) return false;
  const text = encodeURIComponent(buildVerifyMessage(order, formatPrice));
  const url = `https://wa.me/${phone}?text=${text}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
};

export const hasWhatsAppPhone = (order) =>
  Boolean(sanitizePhone(order?.shippingInfo?.phone));
