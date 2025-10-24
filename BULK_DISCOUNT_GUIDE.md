# Bulk Discount Feature - User Guide

## Overview
The bulk discount feature allows admins to apply discounts, update prices, and manage multiple products simultaneously in the admin dashboard.

## How to Use

### 1. Access Product Management
- Navigate to Admin Dashboard → Product Management

### 2. Select Products
- Click the **"Select Products"** button in the top right
- Click on individual products to select them (checkbox appears on each card)
- Use **"Select All"** button to select all visible products
- Selected count shows in the **"Bulk Operations"** button

### 3. Open Bulk Operations
- Click **"Bulk Operations (X)"** button where X is the number of selected products
- A modal will open with three operation tabs

## Available Operations

### 📌 Apply Discount
Apply discounts to multiple products at once.

**Options:**
- **Percentage Discount**: Reduce price by a percentage (e.g., 20% off)
- **Fixed Amount Discount**: Reduce price by a fixed dollar amount (e.g., $10 off)

**Example:**
- Select 10 products
- Choose "Percentage" and enter "25"
- All 10 products will have 25% discount applied

### 💰 Update Prices
Bulk update product prices.

**Options:**
- **Percentage**: Increase/decrease by percentage (e.g., +10% or -10%)
- **Fixed**: Increase/decrease by fixed amount (e.g., +$5 or -$5)
- **Set Price**: Set all products to the same specific price

**Examples:**
- Increase all prices by 15%: Select "Percentage", enter "15"
- Decrease all prices by $3: Select "Fixed", enter "-3"
- Set all to $99.99: Select "Set Price", enter "99.99"

### 🗑️ Remove Discount
Remove all discounts from selected products (resets discountedPrice to $0).

## API Endpoints

### Backend Routes
```javascript
POST /api/products/bulk-discount
POST /api/products/bulk-price-update
POST /api/products/remove-discount
```

### Request Examples

**Apply Discount:**
```json
{
  "productIds": ["id1", "id2", "id3"],
  "discountType": "percentage",
  "discountValue": 20
}
```

**Update Prices:**
```json
{
  "productIds": ["id1", "id2", "id3"],
  "updateType": "percentage",
  "value": 10
}
```

**Remove Discounts:**
```json
{
  "productIds": ["id1", "id2", "id3"]
}
```

## Features

✅ Select individual products or all at once
✅ Visual feedback for selected products
✅ Three types of bulk operations
✅ Real-time price calculations
✅ Success/error notifications
✅ Automatic product list refresh after operations
✅ Admin-only access (protected routes)
✅ Mobile responsive design

## Tips

- Use filters and search to narrow down products before selecting
- The discount is applied to the original price, not the already discounted price
- Price updates respect minimum price of $0 (won't go negative)
- All operations are reversible - you can always adjust prices again
- Changes are saved immediately to the database

## Technical Details

**Frontend Components:**
- `BulkDiscountModal.jsx` - Main modal for bulk operations
- `ProductManagement.jsx` - Updated with selection functionality

**Backend Controllers:**
- `bulkDiscount()` - Apply discounts
- `bulkPriceUpdate()` - Update prices
- `removeDiscount()` - Remove discounts

**Security:**
- All endpoints require admin authentication
- JWT token verification
- Input validation on both frontend and backend
