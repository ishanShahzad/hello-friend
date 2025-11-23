# API Endpoints Verification

## ✅ Backend Routes (from server.js)
```
/api/products     → productRoutes
/api/auth         → authRoutes
/api/cart         → cartRoutes
/api/order        → orderRoutes
/api/user         → userRoutes
/api/stores       → storeRoutes
/api/tax          → taxRoutes
/api/shipping     → shippingRoutes
```

## 📱 Mobile App API Calls

### Authentication (AuthContext.js)
- ✅ POST `/api/auth/registerr` - Signup
- ✅ POST `/api/auth/login` - Login
- ✅ GET `/api/user/single` - Get current user

### Customer Screens

#### HomeScreen.js
- ⚠️ GET `/api/products` → Should be `/api/products/get-products`
- **Status**: NEEDS FIX

#### ProductDetailScreen.js
- ⚠️ GET `/api/products/${id}` → Should be `/api/products/get-single-product/${id}`
- **Status**: NEEDS FIX

#### StoresListingScreen.js
- ⚠️ GET `/api/stores` → Should be `/api/stores/all`
- **Status**: NEEDS FIX

#### StoreScreen.js
- ✅ GET `/api/stores/${slug}` - Correct (matches backend)

#### CheckoutScreen.js
- ✅ POST `/api/order/place` - Place order
- ✅ DELETE `/api/cart/clear` - Clear cart

#### OrdersScreen.js
- ✅ GET `/api/order/user-orders` - Get user orders

#### OrderDetailScreen.js
- ⚠️ GET `/api/order/${orderId}` → Should be `/api/order/detail/${orderId}`
- **Status**: NEEDS FIX

### Admin/Seller Screens

#### ProductManagementScreen.js
- ✅ GET `/api/products/get-products` - Admin products
- ✅ GET `/api/products/get-seller-products` - Seller products
- ✅ DELETE `/api/products/delete/${id}` - Delete product

#### ProductFormScreen.js
- ✅ POST `/api/products/add` - Add product
- ✅ PUT `/api/products/edit/${id}` - Edit product

#### OrderManagementScreen.js
- ✅ GET `/api/order/get` - Get all orders

#### OrderDetailManagementScreen.js
- ✅ GET `/api/order/detail/${id}` - Get order details
- ✅ PATCH `/api/order/update-status/${id}` - Update status

#### AdminUserManagementScreen.js
- ✅ GET `/api/user/get` - Get all users
- ✅ PATCH `/api/user/admin-toggle/${id}` - Toggle admin role

#### AdminTaxConfigurationScreen.js
- ✅ GET `/api/tax/config` - Get tax config
- ✅ PUT `/api/tax/config` - Update tax config

#### SellerStoreSettingsScreen.js
- ✅ GET `/api/stores/my-store` - Get seller store
- ✅ PUT `/api/stores/update` - Update store

#### SellerShippingConfigurationScreen.js
- ✅ GET `/api/shipping/methods` - Get shipping config
- ✅ PUT `/api/shipping/methods` - Update shipping config

#### StoreOverviewScreen.js
- ✅ GET `/api/order/get` - Admin stats (from orders)
- ✅ GET `/api/stores/analytics` - Seller analytics

## 🔧 Required Fixes

### 1. HomeScreen.js
```javascript
// CURRENT (WRONG):
const res = await axios.get(`${API_BASE_URL}/api/products`);

// SHOULD BE:
const res = await axios.get(`${API_BASE_URL}/api/products/get-products`);
```

### 2. ProductDetailScreen.js
```javascript
// CURRENT (WRONG):
const res = await axios.get(`${API_BASE_URL}/api/products/${productId}`);

// SHOULD BE:
const res = await axios.get(`${API_BASE_URL}/api/products/get-single-product/${productId}`);
```

### 3. StoresListingScreen.js
```javascript
// CURRENT (WRONG):
const res = await axios.get(`${API_BASE_URL}/api/stores`);

// SHOULD BE:
const res = await axios.get(`${API_BASE_URL}/api/stores/all`);
```

### 4. OrderDetailScreen.js
```javascript
// CURRENT (WRONG):
const res = await axios.get(`${API_BASE_URL}/api/order/${orderId}`, ...);

// SHOULD BE:
const res = await axios.get(`${API_BASE_URL}/api/order/detail/${orderId}`, ...);
```

## Summary
- **Total Endpoints**: 20+
- **Correct**: 16 ✅
- **Need Fixing**: 4 ⚠️
- **Critical**: All admin/seller endpoints are correct ✅
