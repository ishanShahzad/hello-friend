# Option 1: Live Currency Conversion (No Stored USD)

## Core principle
A product stores ONLY what the seller typed: `price` (number in their currency) + `priceCurrency` (e.g. `"PKR"`). Every read, display, sort, filter, cart total, and Stripe charge converts live using the current FX rate. No frozen USD snapshot anywhere.

## Schema change (Backend/models/Product.js)
- Keep `price` and `discountedPrice` as numbers, but their meaning changes: they are now in `priceCurrency`, NOT USD.
- Keep `priceCurrency` (default `"USD"` for legacy docs — safe because legacy `price` WAS in USD).
- Remove `priceOriginal` / `discountedPriceOriginal` (no longer needed — `price` IS the original).
- No data migration script needed: legacy rows have `priceCurrency` defaulting to USD, which matches what they were stored as.

## Backend write path (productController.js)
- `addProduct` / `editProduct`: store `price`, `discountedPrice`, `priceCurrency` verbatim from payload. Remove `normalizeProductPricing` USD conversion. Validate currency is one of the supported codes.

## Backend read path — the hard part

All product list endpoints accept a `?currency=XXX` query param (defaults to USD). The controller, after fetching docs, runs a single in-memory pass converting each product:
```
displayPrice = convertFromUSD(convertToUSD(price, priceCurrency), displayCurrency)
displayDiscountedPrice = same
```
and overwrites `price` / `discountedPrice` on the returned JSON (keeps `priceCurrency` + a new `priceOriginal` echo for transparency). This keeps every frontend reader unchanged — they keep reading `product.price`.

Endpoints to update:
- `getProducts`, `getSingleProduct`, `getSellerProducts`, `getFeaturedStats` (productController)
- `getFilters` — min/max price range must also convert
- `getWishlist` (wishlistController) — populates products
- `storeController` product lists
- `subdomainController` product lists
- `smartTagController` (if it returns products)
- `personalized` feeds (PersonalizedSections / Sliders endpoints)
- `cartController` — returns populated products
- `orderController` getOrders / getOrderById — orders store snapshotted prices (already historical, leave as-is)
- `aiActionController` / `aiChatController` / `chatbotController` — anywhere products are sent to the LLM

A shared helper `attachDisplayPrices(products, displayCurrency)` will live in `currencyService.js`.

## Sorting & filtering by price
This is the hardest piece. `?sortBy=price&minPrice=10&maxPrice=100` currently sorts/filters on the raw `price` field which would now be in mixed currencies → meaningless.

Solution: MongoDB aggregation pipeline with `$switch` that computes a `_priceUSD` field on the fly using current FX rates pulled into the pipeline as `$let` constants:
```
{ $addFields: { _priceUSD: { $switch: { branches: [
  { case: { $eq: ['$priceCurrency', 'PKR'] }, then: { $divide: ['$price', PKR_RATE] } },
  { case: { $eq: ['$priceCurrency', 'EUR'] }, then: { $divide: ['$price', EUR_RATE] } },
  { case: { $eq: ['$priceCurrency', 'GBP'] }, then: { $divide: ['$price', GBP_RATE] } },
], default: '$price' } } } }
```
Then sort/filter on `_priceUSD`. Apply in `getProducts` whenever `sortBy=price` OR `minPrice`/`maxPrice` is set. Convert incoming `minPrice/maxPrice` (which are in display currency) → USD first.

## Cart totals
- `cartController` — cart stores `productId` + qty. When computing totals, fetch product, convert `price` in `priceCurrency` → user's display currency, return.
- Frontend `CartContext` / `Checkout.jsx`: no change to consumers, controller returns converted numbers.

## Checkout / Stripe (PaymentController.js)
This is the critical correctness fix. At checkout time:
1. For each line item, take product's CURRENT `price` in `priceCurrency`.
2. Convert to buyer's chosen payment currency (Stripe charge currency) using CURRENT FX rate — not a stored value.
3. Pass `unit_amount` to Stripe in that currency's smallest unit.
4. Persist the snapshot onto the `Order` document (`priceAtPurchase`, `currencyAtPurchase`, `fxRateAtPurchase`) so historical orders never drift. Orders ARE allowed to store snapshots — that's correct accounting.

## Order model
- Add `currencyAtPurchase` and `fxRateAtPurchase` to order line items.
- Order display: use stored snapshot (don't re-convert historical orders).

## Frontend changes
- `SellerDashboard.jsx`: simplify — send `{ price, discountedPrice, priceCurrency }` raw. Remove all `convertToUSD` / `convertPrice` plumbing for the form. On edit, prefill from `product.priceOriginal` (echo field returned by API) in `product.priceCurrency`, lock the currency selector to the original currency (changing currency mid-edit would be a different product).
- `CurrencyContext.jsx`: every product fetch now appends `?currency=${activeCurrency}`. Add a global axios interceptor OR a `useApi()` wrapper that injects the param. When the user switches currency, invalidate product caches and refetch.
- `ProductCard.jsx`, `ProductDetailPage.jsx`, `CartDropdown.jsx`, `Checkout.jsx`, etc.: REMOVE all client-side `convertPrice(product.price)` calls — backend now returns already-converted numbers. Just render `product.price` with the active currency symbol.
- `convertPrice` / `convertToUSD` helpers in `CurrencyContext` stay (used by form input UX) but are no longer applied to display.

## Mobile app (MobileApp/)
Same pattern as frontend:
- API calls append `?currency=${activeCurrency}`.
- All product cards/screens stop calling client-side conversion on `product.price`.
- `ProductFormScreen.js` (seller): same edit-lock-currency behavior.
- `CartContext.js`, `CheckoutScreen.js`: trust backend-returned numbers.

## AI / WhatsApp / chatbot
Anywhere a product is serialized into an LLM prompt (`aiChatController`, `chatbotController`, `whatsappAIChatService`, `messageBuilder`), convert to a single human-readable currency (user's preferred, or USD fallback) before injecting. Don't send raw `price` in mixed currencies — the LLM will hallucinate.

## Analytics (analyticsController.js, SellerAnalytics, AdminDashboard)
Revenue charts already aggregate from orders, which now carry `currencyAtPurchase` + `fxRateAtPurchase`. Convert each order line to USD using the SNAPSHOT rate (not current) for historical accuracy, then aggregate. This is correct accounting and matches what Stripe actually charged.

## Email templates (emailTemplates.js)
Order emails: use snapshotted prices from the order doc directly. No conversion needed.

## Coupons (couponController.js)
Discount amounts on coupons: add a `discountCurrency` field; convert at apply time using current FX.

## Test surface
- Seller in PKR creates product at 1000 → DB stores `{ price: 1000, priceCurrency: 'PKR' }`.
- Buyer in USD views → sees `~$3.51` (today's rate).
- Two weeks later, PKR drops → same buyer sees `~$3.20`. Seller still receives 1000 PKR equivalent.
- Buyer adds to cart, checks out → Stripe charges current USD equivalent. Order saves snapshot.
- Buyer opens order history → sees the historical charged amount, never drifts.
- Sort by price across mixed-currency products → correct USD-based ordering using current rates.

## File-by-file impact summary
**Backend (write):** Product.js, productController.js
**Backend (read+convert):** currencyService.js (add helper), productController.js, wishlistController.js, storeController.js, subdomainController.js, cartController.js, smartTagController.js, aiActionController.js, aiChatController.js, chatbotController.js, analyticsController.js
**Backend (checkout):** PaymentController.js, Order.js, orderController.js, orderConfirmationController.js, couponController.js, Coupon.js, emailTemplates.js
**Backend (AI/WA):** whatsappAIChatService.js, messageBuilder.js
**Frontend:** SellerDashboard.jsx, CurrencyContext.jsx, ProductCard.jsx, ProductDetailPage.jsx, CartDropdown.jsx, Checkout.jsx, orders.jsx, UserOrderDetail.jsx, UserOrdersManagement.jsx, OrderConfirmationPage.jsx, Success.jsx, TrackOrderPage.jsx, AccountOverview.jsx, AdminDashboard.jsx, SellerAnalytics.jsx, StoreOverview.jsx, Wishlist.jsx, BulkDiscountModal.jsx, CouponManagement.jsx, ChatBot.jsx, PersonalizedSections.jsx, GlobalContext.jsx
**Mobile:** CartContext.js, CurrencyContext.js, ProductCard.js, ProductDetailScreen.js, CartScreen.js, CheckoutScreen.js, WishlistScreen.js, UserDashboardScreen.js, OrderDetailScreen.js, TrackOrderScreen.js, ProductFormScreen.js, ProductManagementScreen.js, SellerAnalyticsScreen.js, StoreOverviewScreen.js, ChatBot.js, PersonalizedSliders.js, OrderDetailManagementScreen.js

## Rollout order (one PR, but applied in this order to avoid mid-state breakage)
1. Schema + write path (Product.js, productController add/edit)
2. `attachDisplayPrices` helper in currencyService
3. Aggregation pipeline for sort/filter
4. All backend read endpoints attach converted prices + accept `?currency=`
5. Order model snapshot fields + checkout conversion + Stripe charge
6. Frontend: pass `?currency=` everywhere, remove client-side `convertPrice(product.price)` calls
7. Mobile: same as frontend
8. AI/email/whatsapp serializers
9. Analytics aggregations

## What I CAN'T fully verify
- I can edit Backend + Mobile code, but per project memory I cannot run Node/Express or the RN app. You'll need to test locally:
  - Seller adds product in PKR → check DB row
  - Buyer switches currency → check displayed price changes
  - Stripe test checkout → confirm charged amount matches displayed amount
  - Sort by price across mixed currencies → correct order
  - Old orders still display original snapshot

## Estimate
~30 files touched, ~600-900 lines changed/added. I'll work through it sequentially in the order above, one logical chunk per batch.

Approve and I'll execute end-to-end.
