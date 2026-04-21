/**
 * Invoice utilities — generate, share, and print order invoices.
 * Uses backend's pre-styled HTML and renders via expo-print → expo-sharing.
 */
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import api from '../config/api';

/**
 * Fetch invoice HTML, render to PDF, and open the system share sheet.
 * Returns true if the share sheet was opened successfully.
 */
export const shareInvoice = async (orderId) => {
  if (!orderId) throw new Error('orderId required');
  const res = await api.get(`/api/order/invoice/${orderId}`);
  const { html, orderId: humanId } = res.data || {};
  if (!html) throw new Error('No invoice HTML returned');

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
    width: 612, // US Letter pt
    height: 792,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    return { uri, shared: false };
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `Invoice ${humanId || orderId}`,
    UTI: 'com.adobe.pdf',
  });
  return { uri, shared: true };
};

/**
 * Print/preview invoice via system print dialog (no share).
 */
export const printInvoice = async (orderId) => {
  const res = await api.get(`/api/order/invoice/${orderId}`);
  const { html } = res.data || {};
  if (!html) throw new Error('No invoice HTML returned');
  await Print.printAsync({ html });
};
