# API Testing Examples

## Prerequisites

1. Start your backend server: `cd Backend && npm start`
2. Get an admin JWT token (login as admin)
3. Replace `YOUR_JWT_TOKEN` with actual token
4. Replace product IDs with actual IDs from your database

## Test 1: Apply 20% Discount to Multiple Products

```bash
curl -X POST http://localhost:5000/api/products/bulk-discount \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "productIds": ["product_id_1", "product_id_2", "product_id_3"],
    "discountType": "percentage",
    "discountValue": 20
  }'
```

**Expected Response:**
```json
{
  "msg": "Bulk discount applied successfully to 3 product(s)",
  "updatedCount": 3
}
```

## Test 2: Apply $10 Fixed Discount

```bash
curl -X POST http://localhost:5000/api/products/bulk-discount \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "productIds": ["product_id_1", "product_id_2"],
    "discountType": "fixed",
    "discountValue": 10
  }'
```

**Expected Response:**
```json
{
  "msg": "Bulk discount applied successfully to 2 product(s)",
  "updatedCount": 2
}
```

## Test 3: Increase Prices by 15%

```bash
curl -X POST http://localhost:5000/api/products/bulk-price-update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "productIds": ["product_id_1", "product_id_2"],
    "updateType": "percentage",
    "value": 15
  }'
```

**Expected Response:**
```json
{
  "msg": "Bulk price update applied successfully to 2 product(s)",
  "updatedCount": 2
}
```

## Test 4: Decrease Prices by 10%

```bash
curl -X POST http://localhost:5000/api/products/bulk-price-update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "productIds": ["product_id_1", "product_id_2"],
    "updateType": "percentage",
    "value": -10
  }'
```

## Test 5: Add $5 to All Prices

```bash
curl -X POST http://localhost:5000/api/products/bulk-price-update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "productIds": ["product_id_1", "product_id_2"],
    "updateType": "fixed",
    "value": 5
  }'
```

## Test 6: Subtract $3 from All Prices

```bash
curl -X POST http://localhost:5000/api/products/bulk-price-update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "productIds": ["product_id_1", "product_id_2"],
    "updateType": "fixed",
    "value": -3
  }'
```

## Test 7: Set All Products to $99.99

```bash
curl -X POST http://localhost:5000/api/products/bulk-price-update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "productIds": ["product_id_1", "product_id_2", "product_id_3"],
    "updateType": "set",
    "value": 99.99
  }'
```

## Test 8: Remove All Discounts

```bash
curl -X POST http://localhost:5000/api/products/remove-discount \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "productIds": ["product_id_1", "product_id_2", "product_id_3"]
  }'
```

**Expected Response:**
```json
{
  "msg": "Discounts removed successfully from 3 product(s)",
  "updatedCount": 3
}
```

## Error Cases

### Test 9: Missing JWT Token (401 Unauthorized)

```bash
curl -X POST http://localhost:5000/api/products/bulk-discount \
  -H "Content-Type: application/json" \
  -d '{
    "productIds": ["product_id_1"],
    "discountType": "percentage",
    "discountValue": 20
  }'
```

**Expected Response:**
```json
{
  "msg": "Unauthorized"
}
```

### Test 10: Non-Admin User (403 Forbidden)

```bash
curl -X POST http://localhost:5000/api/products/bulk-discount \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_JWT_TOKEN" \
  -d '{
    "productIds": ["product_id_1"],
    "discountType": "percentage",
    "discountValue": 20
  }'
```

**Expected Response:**
```json
{
  "msg": "Unauthorized to apply bulk discount"
}
```

### Test 11: Invalid Discount Type

```bash
curl -X POST http://localhost:5000/api/products/bulk-discount \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "productIds": ["product_id_1"],
    "discountType": "invalid",
    "discountValue": 20
  }'
```

**Expected Response:**
```json
{
  "msg": "Discount type must be \"percentage\" or \"fixed\""
}
```

### Test 12: Empty Product IDs

```bash
curl -X POST http://localhost:5000/api/products/bulk-discount \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "productIds": [],
    "discountType": "percentage",
    "discountValue": 20
  }'
```

**Expected Response:**
```json
{
  "msg": "Product IDs array is required"
}
```

### Test 13: Negative Discount Value

```bash
curl -X POST http://localhost:5000/api/products/bulk-discount \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "productIds": ["product_id_1"],
    "discountType": "percentage",
    "discountValue": -10
  }'
```

**Expected Response:**
```json
{
  "msg": "Valid discount value is required"
}
```

## Using Postman

### Setup:
1. Create a new collection called "Bulk Operations"
2. Add environment variables:
   - `baseUrl`: `http://localhost:5000`
   - `adminToken`: Your admin JWT token

### Request 1: Bulk Discount
- **Method**: POST
- **URL**: `{{baseUrl}}/api/products/bulk-discount`
- **Headers**:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer {{adminToken}}`
- **Body** (raw JSON):
```json
{
  "productIds": ["product_id_1", "product_id_2"],
  "discountType": "percentage",
  "discountValue": 25
}
```

### Request 2: Bulk Price Update
- **Method**: POST
- **URL**: `{{baseUrl}}/api/products/bulk-price-update`
- **Headers**:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer {{adminToken}}`
- **Body** (raw JSON):
```json
{
  "productIds": ["product_id_1", "product_id_2"],
  "updateType": "percentage",
  "value": 10
}
```

### Request 3: Remove Discount
- **Method**: POST
- **URL**: `{{baseUrl}}/api/products/remove-discount`
- **Headers**:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer {{adminToken}}`
- **Body** (raw JSON):
```json
{
  "productIds": ["product_id_1", "product_id_2"]
}
```

## Testing Workflow

### Scenario: Black Friday Sale

1. **Get all product IDs** (use existing GET endpoint)
2. **Apply 30% discount** to all products
3. **Verify** discounts applied correctly
4. **After sale ends**, remove all discounts

### Scenario: Price Adjustment

1. **Filter products** by category (e.g., Electronics)
2. **Get product IDs** from filtered results
3. **Increase prices** by 5%
4. **Verify** new prices

### Scenario: Clearance Sale

1. **Select old inventory** products
2. **Set price** to $9.99 for all
3. **Apply additional 10% discount**
4. **Verify** final prices

## Database Verification

After running API calls, verify in MongoDB:

```javascript
// Check discounted prices
db.products.find({ 
  discountedPrice: { $gt: 0 } 
}).pretty()

// Check specific product
db.products.findOne({ 
  _id: ObjectId("product_id_here") 
})

// Count products with discounts
db.products.countDocuments({ 
  discountedPrice: { $gt: 0 } 
})
```

## Performance Testing

Test with large datasets:

```bash
# Generate 100 product IDs
# Apply bulk discount to all 100
# Measure response time

# Expected: < 2 seconds for 100 products
# Expected: < 5 seconds for 1000 products
```

## Notes

- All prices are rounded to 2 decimal places
- Negative prices are prevented (minimum $0)
- Discounts are applied to original price, not discounted price
- Invalid product IDs are silently skipped
- Operations are atomic (all succeed or all fail)
