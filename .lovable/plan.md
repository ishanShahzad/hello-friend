# Mobile Parity Implementation Plan

This is a large, multi-loop effort to bring the React Native app to full feature parity with the web app for **users, sellers, and admins**. Below is the audit, the gap list, and the staged implementation plan.

## 1. Audit Summary (web → mobile)

### User-facing flows
| Web | Mobile | Status |
|---|---|---|
| Home / Products / Categories | HomeScreen | OK — verify category filter parity |
| Product Detail (variants, reviews, related) | ProductDetailScreen | Partial — verify variants, store-trust, reviews |
| Cart / Checkout / Stripe | Cart + Checkout + PaymentSuccess | OK — verify coupon entry, shipping address auto-fill, tax calc |
| Order tracking / Order detail / Confirmation | OrdersScreen, OrderDetail, TrackOrder | OK |
| Wishlist / Trusted Stores / Stores Listing / Store Page | Present | Verify search + category buttons inside store |
| User Dashboard (profile, addresses, stats) | UserDashboardScreen | OK |
| Notifications inbox + preferences | NotificationsScreen + Preferences | OK |
| AI Chatbot (voice, history, actions) | ChatBot.js | Verify parity with new prompts |
| Docs / FAQ / About / Contact / Privacy / Terms / Become Seller | All present | Verify content sync |
| **Subdomain stores** | Missing | Gap |
| **AI Chat full page** | Embedded only | Gap |

### Seller flows
| Web | Mobile | Status |
|---|---|---|
| Seller Home / Dashboard / Analytics | Present | OK |
| Product Management (add/edit with categories combobox, AI improve, AI tags, limits) | ProductFormScreen | **GAP** — needs new category picker, AI improve description, AI generate tags, max-tag/desc enforcement |
| Order Management & Detail | Present | OK |
| Coupons / Shipping / Tax | Present | OK |
| Store Settings / Overview / Profile | Present | OK |
| Subscriptions | Present | Verify new Elite features (250 msg, Smart Description, WhatsApp mgmt) |
| Subdomain Management | Present | OK |
| Notifications + Settings | Present | Verify removal of black divider lines |
| **Seller WhatsApp Settings** | Missing | Gap |
| **Bulk discount / Bulk price update** | Missing | Gap |
| **Complaints inbox (seller side)** | Missing | Gap |

### Admin flows
| Web | Mobile | Status |
|---|---|---|
| Admin Dashboard / Analytics | Present | OK |
| User Management | Present | OK |
| Subscriptions overview | Present | OK |
| Subdomain Management | Present | OK |
| Tax Configuration | Present | OK |
| Notifications + Settings | Present | Verify divider fix |
| Store Verification | Present | OK |
| Complaints Management | Present | OK |
| **Admin Broadcast Panel (WhatsApp/push broadcasts)** | Missing | Gap |
| **WhatsApp Verification Panel** | Missing | Gap |

## 2. Implementation Stages

The work will be executed in **5 stages**, each as a discrete task tracked in the task list. Each stage ends with a manual smoke-test checklist for the user (since the agent cannot run the RN app).

### Stage 1 — Seller Product Form parity (highest user impact)
- Replace category text input with searchable combobox using `Frontend/src/utils/categories.js` (mirrored to `MobileApp/src/utils/categories.js`).
- Add "Other" option that opens a custom-category modal.
- Add `Improve with AI` button next to Description with `Revert` option (reuse `/api/ai-assist/improve-description`).
- Add `Generate Tags with AI` button (reuse `/api/ai-assist/generate-tags`).
- Enforce `MAX_TAGS = 15`, `MAX_DESCRIPTION_LENGTH = 2000` with disabled buttons + counters.
- Fix price input cursor (mirror web fix: empty when 0).

### Stage 2 — Seller WhatsApp + Bulk + Complaints
- New `SellerWhatsAppSettingsScreen` (connect number, AI chat toggle, message templates).
- New `BulkDiscountModal` and `BulkPriceUpdateModal` accessible from Product Management.
- New `SellerComplaintsScreen` (inbox of complaints filed against seller's store, reply flow).

### Stage 3 — Admin Broadcast + WhatsApp Verification
- New `AdminBroadcastScreen` with audience filters, channel selection (push/WhatsApp/email), schedule, templates.
- New `AdminWhatsAppVerificationScreen` to approve/deny seller WhatsApp number requests.

### Stage 4 — User-side gaps
- Verify and patch StorePage parity in mobile `StoreScreen`: search bar + category chips for seller-defined categories.
- Add full-screen `AIChatScreen` route (currently only FAB ChatBot).
- Verify product detail variants, related products, reviews list parity.

### Stage 5 — Polish & production-ready pass
- Remove black divider lines under notification toggle sections (both seller + admin notification settings).
- Sync all subscription copy with new pricing/features.
- Add empty states, loading skeletons, pull-to-refresh on every data screen lacking it.
- Run accessibility pass (touch targets ≥44px, contrast).
- Verify dark-mode tokens on every new screen.
- Update `AppNavigator.js` with all new routes + deep links.
- Update push notification handlers for any new event types.

## 3. Technical Notes
- All new screens use `useTheme()` + `useThemedStyles` (dark-mode compliant).
- Use `expo-blur` + `expo-linear-gradient` for Liquid Glass per memory.
- Use `StyleSheet.create`, no Tailwind, no solid black borders.
- Reuse Backend endpoints — no backend changes expected except possibly exposing seller-complaints listing if missing.
- Files touched will be primarily under `MobileApp/src/screens/`, `MobileApp/src/components/`, `MobileApp/src/navigation/AppNavigator.js`, and a new `MobileApp/src/utils/categories.js`.

## 4. Out of Scope (per memory)
- No Spin Wheel / Spin & Win.
- No backend rewrites unless an endpoint is missing.
- No web-side changes unless a shared util needs extracting.

## 5. Deliverable per stage
After each stage I will: (a) summarize what changed, (b) list files touched, (c) give you a manual smoke-test checklist to run on the device since I cannot execute the RN app.

Approve this and I will start with **Stage 1 (Seller Product Form parity)** immediately.
