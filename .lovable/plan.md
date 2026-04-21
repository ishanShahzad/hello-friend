# Marketplace: Stores + Brands

Sellers choose **Store** or **Brand** at signup (default: Store). Both live together in a unified "Marketplace" surface, distinguishable via a pill badge. Existing stores keep working — they default to `sellerType: 'store'` and can switch later from store settings.

## Terminology
- Nav label: **Marketplace**
- Web URL: `/marketplace` (keep `/stores` as a redirect → `/marketplace` for backward compatibility)
- Mobile tab/route: `Marketplace` (renamed from `Stores`)
- Type values: `'store'` | `'brand'` — stored on the Store document as `sellerType`

## Backend (Mongo)

### `Backend/models/Store.js`
Add field:
```js
sellerType: { type: String, enum: ['store', 'brand'], default: 'store', index: true }
```
No data migration needed — Mongo applies the default on read/save for existing docs.

### `Backend/controllers/storeController.js`
- `getAllStores`: accept optional `?type=store|brand|all` query param. Filter `{ sellerType }` when not `all`/missing.
- `searchStores`: same `type` filter passthrough.
- `createStore` / `updateStore`: accept and persist `sellerType` (validated against enum).

### `Backend/controllers/authController.js` (seller signup)
- Accept `sellerType` in the seller signup payload, persist on the Store doc created during seller onboarding. Default `'store'`.

## Web (Frontend/)

### Routing — `Frontend/src/routes/AppRoutes.jsx`
- Rename route `/stores` → `/marketplace`
- Add a `<Navigate to="/marketplace" replace />` redirect from `/stores` (and `/stores/*` tail) so old links/SEO don't break.

### Page — rename `Frontend/src/pages/StoresListing.jsx` → `MarketplaceListing.jsx`
- Add a tab bar at the top: **All** · **Brands** · **Stores** (glass pill tabs).
- Tab state syncs with URL: `/marketplace`, `/marketplace?type=brand`, `/marketplace?type=store`.
- Pass `type` to the existing fetch call.
- Update page heading + SEO title/meta to "Marketplace — Stores & Brands on Rozare".

### Nav — `Frontend/src/components/layout/Navbar.jsx`
- Change link text "Stores" → "Marketplace", `to="/marketplace"`.

### Card — `Frontend/src/components/common/StoreCard.jsx`
- Add a small pill badge in the top-right corner: green "Brand" or blue "Store" depending on `store.sellerType`. Uses existing glass-pill styling tokens.

### Detail page — `Frontend/src/pages/StorePage.jsx` (and `SubdomainStorePage.jsx`)
- Show the same pill badge next to the store name in the hero header.

### Search — `Frontend/src/components/common/StoreSearch.jsx` and home search input
- Search already hits `searchStores`. Update the result row to render the type badge alongside the name. No API change beyond what backend already does.

### Seller signup — `Frontend/src/components/auth/SellerSignUp.jsx`
- In the business-details step, add a two-option segmented selector: **Store** (default) / **Brand**. Include in submit payload.

### Store settings — `Frontend/src/components/layout/StoreSettings.jsx`
- Add a "Listing type" segmented control under the General section so sellers can switch between Store and Brand later.

## Mobile (MobileApp/)

### Navigation — `MobileApp/src/navigation/AppNavigator.js`
- Rename `Stores` tab/screen to `Marketplace`. Update tab label + icon stays the same (Store icon).
- Update deep-link config: `stores` → `marketplace`.

### Screen — rename `MobileApp/src/screens/StoresListingScreen.js` → `MarketplaceListingScreen.js`
- Add 3-segment glass tab control: **All / Brands / Stores** at the top, sticky under the header.
- Pass `type` query to API.

### Card — `MobileApp/src/components/common/StoreCard.js`
- Add the same Brand/Store pill badge in the top-right of the card image area.

### Store detail — `MobileApp/src/screens/StoreScreen.js`
- Show pill badge next to the store name in the header hero.

### Home search — `MobileApp/src/screens/HomeScreen.js` (and `common/SearchAutocomplete.js`)
- Render the type badge alongside results from `searchStores` (results already mixed since backend returns both unless filtered).

### Seller signup — `MobileApp/src/screens/auth/SellerSignUpScreen.js`
- Add the **Store / Brand** segmented selector on the business-details step. Default Store. Include in submit payload.

### Seller store settings — `MobileApp/src/screens/seller/SellerStoreSettingsScreen.js`
- Add the same "Listing type" segmented control to switch later.

## Notes / Non-goals
- No new tables, no new backend routes — just one new field + a `type` query filter.
- Brand and Store cards share identical UI; the **only** visual difference is the pill badge.
- "All" tab returns brands and stores mixed, ordered by the existing default sort.
- SEO: old `/stores` URLs 301-redirect to `/marketplace` via the React `<Navigate replace>` (client-side; sufficient for our SPA setup).
