/**
 * WhatsApp order verification helper for mobile.
 * Tries the whatsapp:// scheme first, falls back to https://wa.me/ URL.
 */

import { Linking, Alert } from 'react-native';

const DEFAULT_COUNTRY_CODE = '92';

export const sanitizePhone = (rawPhone) => {
  if (!rawPhone) return '';
  let digits = String(rawPhone).replace(/\D/g, '');
  if (!digits) return '';
  digits = digits.replace(/^0+/, '');
  if (digits.length <= 10) {
    digits = DEFAULT_COUNTRY_CODE + digits;
  }
  return digits;
};

const formatMoney = (n) => `$${Number(n || 0).toFixed(2)}`;

export const buildVerifyMessage = (order) => {
  const fullName = order?.shippingInfo?.fullName || 'Customer';
  const storeName =
    order?.orderItems?.[0]?.product?.store?.storeName ||
    order?.orderItems?.[0]?.store?.storeName ||
    'our store';
  const orderId = order?.orderId || order?._id?.slice(-8)?.toUpperCase() || '';

  const lines = (order?.orderItems || []).map((it) => {
    const name = it?.product?.name || it?.name || 'Item';
    const qty = it?.qty || it?.quantity || 1;
    const price = formatMoney((it?.price || 0) * qty);
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
    `Total: ${formatMoney(total)}`,
    '',
    'Please reply YES to confirm, or let us know if anything needs to change. Thank you!',
  ].join('\n');
};

export const openWhatsAppVerify = async (order) => {
  const phone = sanitizePhone(order?.shippingInfo?.phone);
  if (!phone) {
    Alert.alert('No phone number', 'This order has no phone number on file.');
    return false;
  }
  const text = encodeURIComponent(buildVerifyMessage(order));
  const appUrl = `whatsapp://send?phone=${phone}&text=${text}`;
  const webUrl = `https://wa.me/${phone}?text=${text}`;

  try {
    const supported = await Linking.canOpenURL(appUrl);
    await Linking.openURL(supported ? appUrl : webUrl);
    return true;
  } catch {
    try {
      await Linking.openURL(webUrl);
      return true;
    } catch {
      Alert.alert('Unable to open WhatsApp', 'Please make sure WhatsApp is installed.');
      return false;
    }
  }
};

export const hasWhatsAppPhone = (order) =>
  Boolean(sanitizePhone(order?.shippingInfo?.phone));
