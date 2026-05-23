## Goal

Stop the silent FX drift. Save exactly the number the seller types, in the currency they typed it in. Convert only when a viewer wants to see it in a different currency. Sellers will never again see their price change after saving.

## Strategy (minimal-blast-radius)

Rather than rewrite the ~45 files that currently display `product.price` as USD, the backend will keep returning a USD-normalized `price` for backward compatibility, AND new fields `priceOriginal` + `priceCurrency` for callers that want the seller's true value.

This means: every existing list, card, cart, order, analytics chart keeps working with no changes. Only the seller-side add/edit form needs to switch to using the original-currency fields.

## Changes

### 1. Backend — Product model (`Backend/models/Product.js`)
Add two fields (both optional, with sensible defaults so legacy rows still work):
- `priceOriginal: Number` — the exact number the seller typed
- `priceCurrency: String, default 'USD'` — the currency the seller typed it in
- Same pair for discount: `discountedPriceOriginal`

`price` and `discountedPrice` remain USD-normalized (backward compat for all readers).

### 2. Backend — `addProduct` / `editProduct` (`productController.js`)
- If `priceCurrency` is provided in the payload and is non-USD:
  - Take `req.body.product.price` as the value in `priceCurrency`
  - Set `priceOriginal = price`, `priceCurrency = priceCurrency`
  - Compute `price` (USD) via `convertToUSD(price, priceCurrency)` from `services/currencyService.js`
  - Same for `discountedPrice`
- If `priceCurrency` is USD or missing → treat input as USD (current behavior, sets `priceOriginal = price`, `priceCurrency = 'USD'`).
- This guarantees readers always get a consistent USD `price` AND the seller's exact original.

### 3. Backend — backfill (no migration needed)
Existing products have no `priceOriginal`. The product controller's response will populate it on the fly: `priceOriginal ?? price`, `priceCurrency ?? 'USD'`. No DB write — purely a response shim, so old rows are reinterpreted as USD (which is what they actually are today).

### 4. Frontend — `CurrencyContext.jsx`
Add a new helper:
```js
convertFromCurrency(amount, fromCurrency) → amount in current display currency
```
Used by callers that already know the source currency (the seller's original).

### 5. Frontend — Seller add/edit form (`SellerDashboard.jsx`)
- **Add mode**: stop calling `convertToUSD` on every keystroke. Just store the raw number. On submit, send `{ price, discountedPrice, priceCurrency: currency }` — the backend handles the rest. Cursor jumping is also fixed as a side effect.
- **Edit mode**: prefill the input from `product.priceOriginal` (in `product.priceCurrency`), not from converted USD. Seller sees the exact number they originally saved.
- Lock the currency label to the price's `priceCurrency` while editing (with a "Change currency" note) to prevent accidental currency mixups.

### 6. Out of scope (intentionally unchanged)
- All other display surfaces (ProductCard, cart, orders, analytics, mobile app) continue to use the USD `price` field and the existing `convertPrice`. They keep working unchanged. Down the line you may want to show buyers "Listed in PKR" — that's a future polish, not required for correctness.
- Price-range filter on the products list still operates on USD `price`, which is fine since all products are normalized to USD.

## Net result

- **Seller**: types `1000` in PKR, saves, reopens form → still sees `1000`. Forever.
- **Backend**: stores `priceOriginal=1000, priceCurrency='PKR', price=3.51` (USD at write-time).
- **Buyer in EUR**: sees `price` (USD) × today's USD→EUR rate, same as today.
- **Existing products**: `priceOriginal` is auto-derived as their current USD `price`, treated as USD-entered. No data corruption, no migration needed.

## Files touched

- `Backend/models/Product.js` (+4 fields)
- `Backend/controllers/productController.js` (`addProduct`, `editProduct`, response shim in `getProducts`/`getSingleProduct`/`getSellerProducts`)
- `Frontend/src/contexts/CurrencyContext.jsx` (+1 helper)
- `Frontend/src/components/layout/SellerDashboard.jsx` (input handlers + edit prefill)

Approve and I'll ship it.