## Goal

Make subdomains the only public URL for a store/brand, auto-create a subdomain on store creation, enforce per-field change cooldowns with a confirmation modal, and surface a clear blocked-state countdown everywhere.

---

## 1. Remove path-based store URLs

**Frontend**
- `StoreSettings.jsx`: delete the "Store URL: /store/..." block (lines 340–351) and change the "Preview Store" button (line 666) to open `https://{slug}.rozare.com`.
- `SellerSubdomainManagement.jsx`: keep, already uses subdomain URL.
- Replace navigation in `StoreCard`, `StoreSearch`, `StoreInfo`, `TrustedStoresPage`, `AdminSubdomainManagement` to use `getStoreSubdomainUrl(slug)` (subdomain URL in prod, `/store/:slug` only in localhost).
- `StorePage.jsx`: in production, redirect to `https://{slug}.rozare.com` on mount; otherwise render normally (so localhost dev still works).
- Keep the `/store/:slug` route as a localhost-only fallback (zero impact in production thanks to the redirect).
- Update SEO `canonical` and JSON-LD `url` to the subdomain form.

---

## 2. Auto-generate subdomain at store creation

Already implemented (`generateUniqueSlug`) but the create form lets the seller specify one — keep both paths. Verified no further change needed beyond UI clarification: subdomain field on first creation seeds the value from the typed store name and is editable.

---

## 3. Cooldown rules + warning modal

**Backend — `Store` model (new fields, all default `null`)**

```text
lastSlugChangeAt   Date
lastNameChangeAt   Date
lastTypeChangeAt   Date
blockedAt          Date     // mirrored from subscription so middleware knows
```

**Backend — `storeController.updateStore`**

Enforce:
- `storeSlug` change: must be ≥ 30 days since `lastSlugChangeAt`
- `storeName` change: must be ≥ 7 days since `lastNameChangeAt`
- `sellerType` change: must be ≥ 30 days since `lastTypeChangeAt`

If blocked by cooldown, respond `423` with `{ field, daysRemaining, nextAllowedAt }`.
On a successful change, stamp the corresponding `lastXChangeAt = now`.

Same rules in `subdomainController.adminUpdateSubdomain` are skipped (admin override).

**Frontend — confirmation modal**

In `StoreSettings.jsx` and `SellerSubdomainManagement.jsx`, before saving a name/type/slug change, show a modal:

> "After this change you won't be able to change your **{field}** again for **{X days}**. Continue?"

After save, on `423` response, show inline error with remaining days.

---

## 4. Blocked-state surfacing

When a seller's subscription is `blocked`:
- `subscriptionController` already sets `store.isActive = false` and (per phantom-order fixes) marks `subdomainPurchase.removalScheduledAt = blockedAt + 7 days` when not purchased. Verify and add `store.blockedAt = blockedAt`. On reactivate (paid), clear `blockedAt` and `removalScheduledAt`, set `isActive = true`.
- `subdomainController.getSellerSubdomainAnalytics` returns extra fields:
  ```text
  blocked: boolean
  blockedAt: Date | null
  daysUntilRemoval: number | null     // computed from removalScheduledAt
  isPurchased: boolean
  ```
- After `removalScheduledAt` passes (cron in subscription check or lazy on read), if not purchased: clear `storeSlug` and free the subdomain so anyone can claim it.

**Frontend**
- `StoreSettings.jsx`: replace the green "Active" pill with a red "Blocked — subdomain releases in N day(s)" pill when `blocked`. Disable subdomain/name/type edits while blocked.
- `SellerSubdomainManagement.jsx`: same status pill + countdown banner in the Status Card and Edit Subdomain card. Show "Resolve by subscribing" CTA → `/seller-dashboard/subscription`.

---

## 5. Reclaim verification

Confirm via existing logic:
- After `removalScheduledAt` and not purchased → release slug.
- Released slug becomes `available: true` in `checkSubdomainAvailability`, so any new seller can claim it.
- Add a small lazy cleanup at the top of `checkSubdomainAvailability` and the subdomain detector to release expired blocked, non-purchased slugs on read.

---

## Files touched

**Backend**
- `Backend/models/Store.js` (new fields)
- `Backend/controllers/storeController.js` (cooldown enforcement, slug release)
- `Backend/controllers/subdomainController.js` (analytics payload, slug release)
- `Backend/controllers/subscriptionController.js` (set/clear `blockedAt`, `removalScheduledAt`)
- `Backend/middleware/subdomainDetector.js` (lazy slug release)

**Frontend**
- `Frontend/src/components/layout/StoreSettings.jsx`
- `Frontend/src/components/layout/SellerSubdomainManagement.jsx`
- `Frontend/src/components/layout/AdminSubdomainManagement.jsx`
- `Frontend/src/components/common/StoreCard.jsx`
- `Frontend/src/components/common/StoreSearch.jsx`
- `Frontend/src/components/common/StoreInfo.jsx`
- `Frontend/src/pages/TrustedStoresPage.jsx`
- `Frontend/src/pages/StorePage.jsx` (production redirect + canonical)

No DB migration needed (MongoDB; new fields default to `null`).
