

# WhatsApp Order Auto-Verification (Polls, no typing) — Full Plan

Buyer confirms by tapping a **WhatsApp poll** (Yes / No) — never types. Admin links WhatsApp once via QR scan. Auto-confirmed orders are labeled in seller dashboard. Gated as a Rozare Starter bonus feature.

## Library decision

**Evolution API** — chosen because **poll vote webhooks are stable** (per your research). `whatsapp-web.js` polls send fine but vote-receiving is fragile. Both are free; Evolution wins on the receive side, which is the whole point.

**Hosting (free):** Evolution API is a Docker container — Heroku can't run it. Deploy free on **Railway** ($5 credit/mo, enough for this) or **Render** free web service. After implementation I'll give you a copy-paste Docker deploy guide. Our Heroku backend talks to Evolution via REST + receives webhooks.

## Confirmation flow (poll-only, no typing)

When an order is placed, buyer receives **two WhatsApp messages**:

1. **Order summary text** — "Hi {buyerName}, your order #ROZ-12345 from {storeName}:" + line items (name × qty — price) + **Total: {amount}**.
2. **Poll** — *"Confirm your order?"* with options **✅ Yes, confirm** / **❌ No, cancel** (single-select).

Buyer taps option → Evolution sends `poll.vote` webhook → backend matches phone + pollMessageId to pending order → runs existing `confirmOrder` / `declineOrder` logic with `confirmedVia: 'whatsapp'`.

## Queue & rate-limiting

- FIFO queue persisted in MongoDB (survives Heroku restarts).
- **Random 8–25s delay** between sends to mimic human behavior (mitigates ban risk).
- Retry logic: 3 attempts on send failure with exponential backoff.
- Max 60 messages/hour soft cap as extra safety.

## Admin Dashboard — WhatsApp Verification panel

New section in `AdminDashboard.jsx`:
- **Status pill**: Disconnected / Awaiting QR scan / Connected as +92xxx (with last-seen timestamp).
- **Link WhatsApp** button → modal showing live QR code (auto-refreshed every 5s, expires after ~60s with re-generate option). Step-by-step instructions: "Open WhatsApp → Settings → Linked Devices → Link a Device → Scan".
- **Disconnect** button (with confirm).
- **Recent activity list** (last 20 messages): order ID, buyer phone (masked), status (queued / sent / voted ✅ / voted ❌ / failed), timestamp.
- Honest disclaimer card: "This automates a personal WhatsApp account. Use a dedicated business number to be safe."

## Seller Dashboard — confirmation badge

On every order row in `SellerDashboard.jsx` (web) and `OrderManagementScreen.js` (mobile):
- When `order.confirmation.confirmedVia === 'whatsapp'` → green pill **"✓ Confirmed via Rozare WhatsApp"** next to status.
- When voted No → red pill **"Declined via WhatsApp"**.
- When still pending → yellow pill **"Awaiting WhatsApp reply"**.

## Subscription gating (Rozare Starter bonus)

- New helper `sellerHasWhatsAppVerify(userId)` — true on `trial` OR `bonusFeaturesActive` (mirrors Featured-Products gating).
- On order placement: check each unique seller in the order; if ≥1 entitled seller AND admin has WhatsApp linked → enqueue.
- Add **"Automated WhatsApp order verification (poll-based, no buyer typing)"** to bonus list on:
  - Web: `SellerSubscription.jsx`
  - Mobile: `SellerSubscriptionScreen.js`

## Backend architecture

```text
Order placed → orderController.placeOrder
                      ↓
            sellerHasWhatsAppVerify? + WhatsApp connected?
                      ↓ yes
         WhatsAppPendingMessage saved (status: queued)
                      ↓
              queueProcessor (8–25s delay)
                      ↓
         Evolution API: send text → send poll
                      ↓
              status: sent, store pollMessageId
                      ↓
         Buyer taps poll option in WhatsApp
                      ↓
       Evolution webhook → /api/whatsapp/webhook
                      ↓
          Match pollMessageId → pending message → order
                      ↓
       Run existing confirmOrder/declineOrder logic
       (sends seller email + push notification)
                      ↓
         confirmation.confirmedVia = 'whatsapp'
```

## File touch list

**New files**
- `Backend/services/whatsapp/evolutionClient.js` — REST wrapper (createInstance, getQR, sendText, sendPoll, logout, status)
- `Backend/services/whatsapp/queue.js` — FIFO processor with random delay + retries
- `Backend/services/whatsapp/webhookHandler.js` — parses `poll.vote` events, matches pending messages
- `Backend/services/whatsapp/messageBuilder.js` — formats order summary text
- `Backend/models/WhatsAppConfig.js` — singleton: status, linkedNumber, instanceName, linkedAt, lastSeen
- `Backend/models/WhatsAppPendingMessage.js` — orderId, phone, pollMessageId, status, attempts, timestamps
- `Backend/controllers/whatsappController.js` — admin endpoints + webhook receiver
- `Backend/routes/whatsappRoutes.js`
- `Frontend/src/components/layout/admin/WhatsAppVerificationPanel.jsx`

**Modified files**
- `Backend/server.js` — mount `/api/whatsapp`, boot queue processor on dyno start
- `Backend/controllers/orderController.js` — enqueue hook in `placeOrder` + Stripe webhook path
- `Backend/controllers/orderConfirmationController.js` — accept `confirmedVia: 'whatsapp'`
- `Backend/controllers/subscriptionController.js` — add `sellerHasWhatsAppVerify` helper
- `Backend/models/Order.js` — extend `confirmedVia` enum to include `'whatsapp'`
- `Frontend/src/components/layout/AdminDashboard.jsx` — mount WhatsApp panel
- `Frontend/src/components/layout/SellerDashboard.jsx` — WhatsApp confirmation pill on order rows
- `Frontend/src/components/layout/SellerSubscription.jsx` — bonus list line
- `MobileApp/src/screens/seller/SellerSubscriptionScreen.js` — bonus list line
- `MobileApp/src/screens/shared/OrderManagementScreen.js` — WhatsApp confirmation pill

## Secrets required (after Evolution deployed)

I'll request these via the secrets tool **after** you've deployed Evolution on Railway/Render:
- `EVOLUTION_API_URL` — your Railway/Render URL (e.g., `https://rozare-evolution.up.railway.app`)
- `EVOLUTION_API_KEY` — global API key set during Evolution deploy
- `EVOLUTION_INSTANCE_NAME` — e.g., `rozare-main`
- `EVOLUTION_WEBHOOK_SECRET` — shared secret to verify incoming webhooks

## Heroku notes

- **No Puppeteer, no buildpacks needed** — Evolution runs externally, our backend just makes HTTP calls.
- Existing dyno handles it. Just redeploy backend after implementation.
- Webhook URL to register with Evolution: `https://your-heroku-app.herokuapp.com/api/whatsapp/webhook`

## Implementation order

1. Models + Evolution REST client + message builder
2. Queue processor + webhook handler + order placement hook
3. Admin endpoints + WhatsApp Verification panel UI
4. Seller dashboard confirmation pills (web + mobile)
5. Subscription bonus list updates (web + mobile)
6. Post-deploy: Evolution Docker setup guide + secrets request

Approve and I'll implement everything in one pass.

