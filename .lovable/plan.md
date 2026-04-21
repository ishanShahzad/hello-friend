

## WhatsApp Order Verification Button

Add a one-tap "Verify on WhatsApp" button to each order row in the seller (and admin) order list on **web** and **mobile**. Tapping it opens WhatsApp directly with the buyer's number and a pre-filled verification message containing the customer name, order ID, items, and total.

### How it works (user flow)

1. Seller opens **Order Management**.
2. Each order row gets a small green WhatsApp icon button next to the existing "View" link.
3. Tap → opens WhatsApp (mobile app on phones, WhatsApp Web/desktop on laptops) at the buyer's phone number with a ready-to-send message.
4. Seller just hits send — no typing required.

### Pre-filled message template

```text
Hello {fullName}, this is {storeName} on Rozare.

We're verifying your order #{orderId}:
• {productName} x{qty} — {price}
• {productName} x{qty} — {price}

Total: {totalAmount}

Please reply YES to confirm, or let us know if anything needs to change. Thank you!
```

### Files to change

**Web**
- `Frontend/src/components/layout/orders.jsx` — add a `WhatsApp` icon button (lucide `MessageCircle` styled green) in both the desktop table row (Actions column) and mobile card. Click handler stops link propagation and calls `openWhatsApp(order)`.
- New helper `Frontend/src/utils/whatsapp.js` — exports `buildVerifyMessage(order)` and `openWhatsAppVerify(order, currency)`. Uses `https://wa.me/<digits>?text=<encoded>` which natively routes to WhatsApp app on mobile browsers and WhatsApp Web on desktop.

**Mobile**
- `MobileApp/src/components/common/OrderCard.js` — add a small WhatsApp action button in the card footer (visible when used inside seller/admin order management; gated by an `onWhatsApp` prop so it doesn't show on the buyer's own orders list).
- `MobileApp/src/screens/shared/OrderManagementScreen.js` — pass `onWhatsApp={(order) => openWhatsAppVerify(order)}` to `OrderCard`.
- New helper `MobileApp/src/utils/whatsapp.js` — same message builder; uses `Linking.openURL('whatsapp://send?phone=...&text=...')` with a `wa.me` HTTPS fallback if the app isn't installed.

### Phone number handling

- Source: `order.shippingInfo.phone` (already collected at checkout — confirmed in `Backend/models/Order.js`).
- Sanitize: strip all non-digits. If the number doesn't start with a country code, prepend the store's default country code (fallback `92` for Pakistan, matching `shippingInfo.country` default). Logic lives in `whatsapp.js` so it's identical on web and mobile.
- If the phone field is empty, the button shows a disabled state with a tooltip "No phone number on file".

### Notes

- **No backend changes needed.** Phone, items, and totals are already on each order.
- **No new packages.** `wa.me` URLs work in every browser; `Linking` is already used in the mobile app.
- Button is **seller/admin only** — guarded by `currentUser?.role` on web and the existing `isAdmin`/seller route on mobile.

