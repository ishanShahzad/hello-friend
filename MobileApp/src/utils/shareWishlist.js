/**
 * Share Wishlist — generates an HTML preview of the user's wishlist
 * and shares it via expo-sharing (PDF) or React Native Share (deep link).
 */
import { Share, Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const buildHtml = (items, userName = 'My') => {
  const rows = items.map((it) => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #eee">
        <img src="${it.image || it.images?.[0]?.url || ''}" width="60" height="60" style="border-radius:8px;object-fit:cover" />
      </td>
      <td style="padding:12px;border-bottom:1px solid #eee;font-family:-apple-system,Inter,sans-serif">
        <div style="font-weight:600;color:#111;font-size:14px">${(it.name || '').replace(/</g, '&lt;')}</div>
        <div style="color:#6366f1;font-weight:700;margin-top:4px">$${(it.discountedPrice || it.price || 0).toFixed(2)}</div>
      </td>
    </tr>`).join('');
  return `<!doctype html><html><body style="margin:0;padding:24px;font-family:-apple-system,Inter,sans-serif;background:#fafafa">
    <h1 style="font-size:28px;color:#111;margin:0 0 4px">${userName} Wishlist</h1>
    <p style="color:#666;margin:0 0 24px">${items.length} item${items.length === 1 ? '' : 's'} from Tortrose</p>
    <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden">
      ${rows}
    </table>
    <p style="text-align:center;color:#999;margin-top:32px;font-size:12px">Shop more at tortrose.com</p>
  </body></html>`;
};

export const shareWishlistAsLink = async (items = [], userName = 'My') => {
  const top = items.slice(0, 5).map((it) => `• ${it.name}`).join('\n');
  const message = `${userName} Wishlist on Tortrose\n${items.length} items\n\n${top}\n\nShop on Tortrose: https://tortrose.com`;
  try {
    await Share.share({ message, title: `${userName} Wishlist` });
    return true;
  } catch { return false; }
};

export const shareWishlistAsPdf = async (items = [], userName = 'My') => {
  try {
    const { uri } = await Print.printToFileAsync({ html: buildHtml(items, userName) });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `${userName} Wishlist` });
      return true;
    }
    return false;
  } catch { return false; }
};
