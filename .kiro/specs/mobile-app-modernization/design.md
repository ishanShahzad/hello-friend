# Design Document: Mobile App Modernization

## Overview

This design document outlines the comprehensive modernization of the Rozare MobileApp to achieve a professional, modern e-commerce experience matching the web Frontend. The implementation transforms the existing basic mobile app into a polished platform with complete role-based dashboards, modern UI/UX patterns, smooth animations, and comprehensive user flows for all user states.

The modernization includes:
1. Modern theme system with consistent design tokens
2. Professional animated loading states matching website
3. Comprehensive empty states and error handling
4. Complete guest user browsing experience
5. Enhanced authentication flow with modern design
6. Polished product browsing, cart, and checkout flows
7. Complete Seller Dashboard with full store management
8. Complete Admin Dashboard with platform management
9. Modern navigation with animations and micro-interactions
10. Responsive design and accessibility compliance

## Architecture

```mermaid
graph TB
    subgraph "MobileApp Architecture"
        subgraph "Entry Point"
            App[App.js]
        end
        
        subgraph "Navigation Layer"
            AppNavigator[AppNavigator.js]
            MainTabs[Bottom Tab Navigator]
            AuthStack[Auth Stack]
            SellerStack[Seller Stack]
            AdminStack[Admin Stack]
        end
        
        subgraph "Context Providers"
            AuthContext[AuthContext]
            GlobalContext[GlobalContext]
            CurrencyContext[CurrencyContext]
        end
        
        subgraph "Shared Components"
            Loader[Loader]
            EmptyState[EmptyState]
            ProductCard[ProductCard]
            StoreCard[StoreCard]
            OrderCard[OrderCard]
            StatCard[StatCard]
            ActionCard[ActionCard]
            TrustButton[TrustButton]
            VerifiedBadge[VerifiedBadge]
            SpinWheel[SpinWheel]
            SpinBanner[SpinBanner]
            CurrencySelector[CurrencySelector]
        end
        
        subgraph "Main Screens"
            HomeScreen[HomeScreen]
            ProductDetailScreen[ProductDetailScreen]
            CartScreen[CartScreen]
            CheckoutScreen[CheckoutScreen]
            WishlistScreen[WishlistScreen]
            OrdersScreen[OrdersScreen]
            OrderDetailScreen[OrderDetailScreen]
            ProfileScreen[ProfileScreen]
            StoresListingScreen[StoresListingScreen]
            StoreScreen[StoreScreen]
            TrustedStoresScreen[TrustedStoresScreen]
            SpinWheelScreen[SpinWheelScreen]
            BecomeSellerScreen[BecomeSellerScreen]
        end
        
        subgraph "Auth Screens"
            LoginScreen[LoginScreen]
            SignUpScreen[SignUpScreen]
            ForgotPasswordScreen[ForgotPasswordScreen]
        end
        
        subgraph "Seller Screens"
            SellerDashboard[SellerDashboardScreen]
            SellerProductMgmt[ProductManagementScreen]
            SellerProductForm[ProductFormScreen]
            SellerOrderMgmt[OrderManagementScreen]
            SellerOrderDetail[OrderDetailManagementScreen]
            SellerStoreSettings[SellerStoreSettingsScreen]
            SellerShipping[SellerShippingConfigurationScreen]
            SellerStoreOverview[StoreOverviewScreen]
        end
        
        subgraph "Admin Screens"
            AdminDashboard[AdminDashboardScreen]
            AdminUserMgmt[AdminUserManagementScreen]
            AdminTaxConfig[AdminTaxConfigurationScreen]
            AdminStoreVerify[StoreVerificationScreen]
            AdminStoreOverview[StoreOverviewScreen]
            AdminProductMgmt[ProductManagementScreen]
            AdminOrderMgmt[OrderManagementScreen]
        end
        
        subgraph "Theme System"
            Theme[theme.js]
            Colors[colors]
            Typography[typography]
            Spacing[spacing]
            Shadows[shadows]
        end
    end
    
    subgraph "Backend API"
        AuthAPI[/api/auth/*]
        UserAPI[/api/user/*]
        ProductAPI[/api/products/*]
        StoreAPI[/api/stores/*]
        CartAPI[/api/cart/*]
        OrderAPI[/api/order/*]
        SpinAPI[/api/spin/*]
        TrustAPI[/api/trust/*]
        CurrencyAPI[/api/currency/*]
        TaxAPI[/api/tax/*]
        ShippingAPI[/api/shipping/*]
    end
    
    App --> AuthContext
    App --> GlobalContext
    App --> CurrencyContext
    App --> AppNavigator
    
    AppNavigator --> MainTabs
    AppNavigator --> AuthStack
    AppNavigator --> SellerStack
    AppNavigator --> AdminStack
    
    MainTabs --> HomeScreen
    MainTabs --> StoresListingScreen
    MainTabs --> CartScreen
    MainTabs --> WishlistScreen
    MainTabs --> ProfileScreen
    
    AuthStack --> LoginScreen
    AuthStack --> SignUpScreen
    AuthStack --> ForgotPasswordScreen
    
    SellerStack --> SellerDashboard
    SellerStack --> SellerProductMgmt
    SellerStack --> SellerOrderMgmt
    SellerStack --> SellerStoreSettings
    SellerStack --> SellerShipping
    
    AdminStack --> AdminDashboard
    AdminStack --> AdminUserMgmt
    AdminStack --> AdminTaxConfig
    AdminStack --> AdminStoreVerify
    
    HomeScreen --> ProductCard
    HomeScreen --> SpinBanner
    HomeScreen --> Loader
    
    ProductDetailScreen --> TrustButton
    ProductDetailScreen --> VerifiedBadge
    
    StoreScreen --> TrustButton
    StoreScreen --> VerifiedBadge
    StoreScreen --> ProductCard
    
    SellerDashboard --> StatCard
    SellerDashboard --> ActionCard
    SellerDashboard --> OrderCard
    
    AdminDashboard --> StatCard
    AdminDashboard --> ActionCard
    
    GlobalContext --> CartAPI
    GlobalContext --> ProductAPI
    GlobalContext --> SpinAPI
    AuthContext --> AuthAPI
    AuthContext --> UserAPI
    CurrencyContext --> CurrencyAPI
```

## Components and Interfaces

### 1. Theme System (theme.js)

The centralized theme system provides consistent design tokens across the app.

```javascript
// MobileApp/src/styles/theme.js
export const colors = {
  // Primary palette (matching website indigo/purple)
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  primaryLight: '#818cf8',
  primaryLighter: '#c7d2fe',
  
  // Secondary/accent
  secondary: '#8b5cf6',
  accent: '#a855f7',
  
  // Semantic colors
  success: '#10b981',
  successLight: '#d1fae5',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  error: '#ef4444',
  errorLight: '#fee2e2',
  info: '#3b82f6',
  infoLight: '#dbeafe',
  
  // Neutrals
  dark: '#1f2937',
  gray: '#6b7280',
  grayLight: '#9ca3af',
  light: '#f3f4f6',
  lighter: '#f9fafb',
  white: '#ffffff',
  
  // Background
  background: '#f9fafb',
  surface: '#ffffff',
  
  // Text
  text: '#1f2937',
  textSecondary: '#6b7280',
  textLight: '#9ca3af',
  
  // Special
  star: '#fbbf24',
  heart: '#ef4444',
  verified: '#3b82f6',
  
  // Gradients (for LinearGradient)
  gradientPrimary: ['#6366f1', '#8b5cf6'],
  gradientSuccess: ['#10b981', '#34d399'],
  gradientWarning: ['#f59e0b', '#fbbf24'],
  gradientError: ['#ef4444', '#f87171'],
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
};

export const fontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
  title: 28,
  hero: 32,
};

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};

export const borderRadius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  xxxl: 24,
  full: 9999,
};

export const shadows = {
  none: {},
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};
```

### 2. Loader Component

Animated multi-ring loader matching the website design.

```javascript
// MobileApp/src/components/common/Loader.js
interface LoaderProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  fullScreen?: boolean;
}
```

Implementation:
- Uses react-native-svg for ring rendering
- Animated.timing for rotation animations
- Four rings with staggered animations (red, yellow, blue, green)
- Three size variants: small (40px), medium (80px), large (120px)
- Optional fullScreen mode with backdrop

### 3. EmptyState Component

Consistent empty state display across the app.

```javascript
// MobileApp/src/components/common/EmptyState.js
interface EmptyStateProps {
  icon: string; // Ionicons name
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}
```

Implementation:
- Large icon (64-80px) in muted color
- Title in semibold text
- Optional subtitle in secondary color
- Optional action button with primary styling

### 4. StatCard Component

Dashboard statistics display card.

```javascript
// MobileApp/src/components/common/StatCard.js
interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  iconColor?: string;
  iconBgColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onPress?: () => void;
}
```

Implementation:
- Icon in colored circular background
- Large value display with title below
- Optional trend indicator with arrow and percentage
- Card with shadow and rounded corners

### 5. ActionCard Component

Dashboard quick action navigation card.

```javascript
// MobileApp/src/components/common/ActionCard.js
interface ActionCardProps {
  title: string;
  icon: string;
  color: string;
  onPress: () => void;
  badge?: number;
}
```

Implementation:
- Icon in colored background
- Title text
- Chevron indicator for navigation
- Optional badge for notifications
- Colored left border accent

### 6. OrderCard Component

Order display card for lists.

```javascript
// MobileApp/src/components/common/OrderCard.js
interface OrderCardProps {
  order: Order;
  onPress: () => void;
  showCustomer?: boolean; // For seller/admin views
}
```

Implementation:
- Order ID and date
- Status badge with appropriate color
- Item count and total amount
- Customer name (for seller/admin)
- Chevron for navigation

### 7. Enhanced ProductCard Component

Modern product card with animations.

```javascript
// MobileApp/src/components/ProductCard.js
interface ProductCardProps {
  product: Product;
  index: number;
  spinResult?: SpinResult;
  onPress: () => void;
  compact?: boolean;
}
```

Implementation:
- Image with shimmer loading placeholder
- Badges: Featured, Discount, Spin Prize, Out of Stock
- Quick action buttons: Wishlist, Cart
- Price display with original/discounted
- Rating stars
- Add to Cart button with loading state
- Staggered entrance animation based on index

### 8. Enhanced StoreCard Component

Modern store card with trust and verification.

```javascript
// MobileApp/src/components/common/StoreCard.js
interface StoreCardProps {
  store: Store;
  onPress: () => void;
  showTrustButton?: boolean;
}
```

Implementation:
- Store logo/avatar
- Store name with VerifiedBadge
- Trust count display
- Optional TrustButton
- Product count
- Card with shadow

## Data Models

### User Model

```javascript
interface User {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'seller' | 'admin';
  avatar?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  store?: string; // Store ID for sellers
  createdAt: Date;
}
```

### Product Model

```javascript
interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  discountedPrice?: number;
  category: string;
  brand: string;
  stock: number;
  image: string;
  images: Array<{ url: string; public_id: string }>;
  rating: number;
  numReviews: number;
  isFeatured: boolean;
  store: Store;
  createdAt: Date;
}
```

### Store Model

```javascript
interface Store {
  _id: string;
  storeName: string;
  description?: string;
  logo?: string;
  banner?: string;
  owner: User;
  trustCount: number;
  verification: {
    isVerified: boolean;
    verifiedAt?: Date;
    verifiedBy?: string;
  };
  products: Product[];
  createdAt: Date;
}
```

### Order Model

```javascript
interface Order {
  _id: string;
  user: User;
  orderItems: Array<{
    product: Product;
    qty: number;
    price: number;
  }>;
  shippingInfo: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  shippingMethod: {
    name: string;
    price: number;
    estimatedDays: number;
  };
  orderSummary: {
    subtotal: number;
    shippingCost: number;
    tax: number;
    totalAmount: number;
  };
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentMethod: string;
  isPaid: boolean;
  paidAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
}
```

### Cart Model

```javascript
interface CartItem {
  _id: string;
  product: Product;
  qty: number;
}

interface Cart {
  cart: CartItem[];
  totalCartPrice: number;
}
```

### SpinResult Model

```javascript
interface SpinResult {
  _id: string;
  user: string;
  discount: number;
  discountType: 'percentage' | 'fixed' | 'free';
  label: string;
  selectedProducts: string[];
  hasCheckedOut: boolean;
  isWinner: boolean | null;
  expiresAt: Date;
  createdAt: Date;
}
```

### TaxConfig Model

```javascript
interface TaxConfig {
  _id: string;
  region: string;
  rate: number;
  description?: string;
  isActive: boolean;
  createdAt: Date;
}
```

### ShippingMethod Model

```javascript
interface ShippingMethod {
  _id: string;
  store: string;
  name: string;
  price: number;
  estimatedDays: number;
  isActive: boolean;
  createdAt: Date;
}
```

## API Endpoints

```javascript
// MobileApp/src/config/api.js
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/registerr',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
  },
  USER: {
    GET_SINGLE: '/api/user/single',
    UPDATE: '/api/user/update',
    BECOME_SELLER: '/api/user/become-seller',
    GET_ALL: '/api/user/all', // Admin
    UPDATE_ROLE: '/api/user/update-role', // Admin
  },
  PRODUCTS: {
    GET_ALL: '/api/products/get-products',
    GET_SINGLE: '/api/products/get-single',
    GET_FILTERS: '/api/products/get-filters',
    CREATE: '/api/products/create',
    UPDATE: '/api/products/update',
    DELETE: '/api/products/delete',
    GET_WISHLIST: '/api/products/get-wishlist',
    ADD_TO_WISHLIST: '/api/products/add-to-wishlist',
    DELETE_FROM_WISHLIST: '/api/products/delete-from-wishlist',
  },
  STORES: {
    GET_ALL: '/api/stores/get-all',
    GET_SINGLE: '/api/stores/get-single',
    GET_TRUSTED: '/api/stores/trusted',
    TRUST: '/api/stores/:storeId/trust',
    TRUST_STATUS: '/api/stores/:storeId/trust-status',
    UPDATE: '/api/stores/update',
    VERIFY: '/api/stores/verify', // Admin
    UNVERIFY: '/api/stores/unverify', // Admin
  },
  CART: {
    GET: '/api/cart/get',
    ADD: '/api/cart/add',
    REMOVE: '/api/cart/remove',
    QTY_INC: '/api/cart/qty-inc',
    QTY_DEC: '/api/cart/qty-dec',
    CLEAR: '/api/cart/clear',
  },
  ORDER: {
    PLACE: '/api/order/place',
    GET_USER_ORDERS: '/api/order/user-orders',
    GET_SINGLE: '/api/order/single',
    GET_STORE_ORDERS: '/api/order/store-orders', // Seller
    GET_ALL: '/api/order/all', // Admin
    UPDATE_STATUS: '/api/order/update-status',
    CANCEL: '/api/order/cancel',
  },
  SPIN: {
    SAVE_RESULT: '/api/spin/save-result',
    GET_ACTIVE: '/api/spin/get-active',
    ADD_PRODUCTS: '/api/spin/add-products',
    CHECKOUT: '/api/spin/checkout',
  },
  TAX: {
    GET_ALL: '/api/tax/get-all',
    CREATE: '/api/tax/create',
    UPDATE: '/api/tax/update',
    DELETE: '/api/tax/delete',
  },
  SHIPPING: {
    GET_STORE: '/api/shipping/store',
    CREATE: '/api/shipping/create',
    UPDATE: '/api/shipping/update',
    DELETE: '/api/shipping/delete',
  },
  CURRENCY: {
    GET_RATES: '/api/currency/get-rates',
  },
};
```

</content>
</invoke>


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Theme System Completeness

*For any* theme object, it SHALL contain all required keys: colors (with primary, secondary, success, warning, error, text, background), spacing (xs through xxxl), fontSize (xs through title), fontWeight (normal through bold), borderRadius (sm through full), and shadows (sm through xl), with all values being of the correct type (strings for colors, numbers for spacing/fontSize/borderRadius).

**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

### Property 2: Guest User Access Control

*For any* screen that requires authentication (Cart, Wishlist, Checkout, Orders), when currentUser is null, the screen SHALL render a login prompt component instead of the authenticated content.

**Validates: Requirements 4.3, 4.4, 4.6, 4.7, 4.8**

### Property 3: Guest User Browsing Access

*For any* public screen (Home, ProductDetail, StoresListing, StoreScreen), when currentUser is null, the screen SHALL render successfully without requiring authentication.

**Validates: Requirements 4.1, 4.2**

### Property 4: Role-Based Menu Visibility

*For any* user with a specific role, the ProfileScreen menu SHALL display role-appropriate options: 'user' role shows "Become a Seller", 'seller' role shows "Seller Dashboard", 'admin' role shows "Admin Dashboard".

**Validates: Requirements 13.3, 13.4, 13.5**

### Property 5: Empty State Rendering

*For any* list component (Orders, Wishlist, Products, Stores, Cart) with an empty data array, the component SHALL render an EmptyState component with appropriate icon, title, and action button.

**Validates: Requirements 3.1, 8.7, 10.5, 12.4, 14.6, 15.5, 18.7, 20.6, 23.5, 26.6**

### Property 6: ProductCard Data Display

*For any* valid Product object, the ProductCard component SHALL display: product image (or placeholder), product name, formatted price, category, and rating stars matching the rating value.

**Validates: Requirements 6.4, 7.2, 7.3, 7.4**

### Property 7: ProductCard Spin Discount Display

*For any* Product with hasSpinDiscount=true and an active spinResult, the ProductCard SHALL display the spinDiscountedPrice with the original price struck through.

**Validates: Requirements 6.5**

### Property 8: ProductCard Out of Stock State

*For any* Product with stock=0, the ProductCard SHALL display an "Out of Stock" indicator and the Add to Cart button SHALL be disabled.

**Validates: Requirements 7.7**

### Property 9: OrderCard Status Badge Colors

*For any* Order object, the OrderCard status badge SHALL use the correct color: pending=yellow, processing=blue, shipped=purple, delivered=green, cancelled=red.

**Validates: Requirements 10.3**

### Property 10: Order List Sorting

*For any* array of Orders displayed in OrdersScreen, the orders SHALL be sorted by createdAt date in descending order (newest first).

**Validates: Requirements 10.1**

### Property 11: Cart Total Calculation

*For any* Cart with items, the displayed total SHALL equal the sum of (item.price * item.qty) for all items, accounting for any spin discounts on applicable items.

**Validates: Requirements 8.3, 8.4, 8.8**

### Property 12: Checkout Order Summary

*For any* CheckoutScreen render with cart items, the order summary SHALL display all cart items and the total breakdown (subtotal, shipping, tax, total) SHALL be mathematically correct.

**Validates: Requirements 9.1, 9.4**

### Property 13: Form Validation Feedback

*For any* form submission with invalid data (Login, SignUp, Checkout, ProductForm), the form SHALL display error messages for each invalid field and prevent submission.

**Validates: Requirements 5.4, 9.2, 19.3, 22.4**

### Property 14: Navigation Role Redirect

*For any* successful login, the app SHALL navigate to the appropriate screen based on user role: 'user' to Home, 'seller' to SellerDashboard, 'admin' to AdminDashboard.

**Validates: Requirements 5.6**

### Property 15: StoreCard Verified Badge

*For any* Store object, the StoreCard SHALL display the VerifiedBadge if and only if store.verification.isVerified is true.

**Validates: Requirements 14.2, 15.1**

### Property 16: Seller Dashboard Statistics

*For any* SellerDashboardScreen render, the dashboard SHALL display StatCards for: total products, total orders, revenue, and pending orders, each with an icon and formatted value.

**Validates: Requirements 17.1, 17.2**

### Property 17: Seller Dashboard Action Cards

*For any* SellerDashboardScreen render, the dashboard SHALL display ActionCards for: Store Overview, Product Management, Order Management, Store Settings, and Shipping Configuration, each with icon, title, and navigation handler.

**Validates: Requirements 17.3, 17.4**

### Property 18: Admin Dashboard Statistics

*For any* AdminDashboardScreen render, the dashboard SHALL display StatCards for: total users, total stores, total products, total orders, and total revenue.

**Validates: Requirements 24.1, 24.2**

### Property 19: Admin Dashboard Action Cards

*For any* AdminDashboardScreen render, the dashboard SHALL display ActionCards for: Store Overview, Product Management, Order Management, User Management, Tax Configuration, and Store Verification, each with distinct color and icon.

**Validates: Requirements 24.3, 24.4**

### Property 20: User List Filtering

*For any* AdminUserManagementScreen with role filter applied, the displayed users SHALL only include users matching the selected role filter.

**Validates: Requirements 25.1, 25.3**

### Property 21: User Search Functionality

*For any* search query in AdminUserManagementScreen, the displayed users SHALL only include users whose name or email contains the search query (case-insensitive).

**Validates: Requirements 25.5**

### Property 22: Tax Rate Display Format

*For any* TaxConfig object displayed in AdminTaxConfigurationScreen, the rate SHALL be displayed as a percentage with the '%' symbol.

**Validates: Requirements 26.5**

### Property 23: Store Verification Status Display

*For any* Store in StoreVerificationScreen, the store item SHALL display the current verification status and, if verified, the verification date.

**Validates: Requirements 27.1, 27.6**

### Property 24: Store Search Functionality

*For any* search query in StoreVerificationScreen, the displayed stores SHALL only include stores whose storeName contains the search query (case-insensitive).

**Validates: Requirements 27.5**

### Property 25: Bottom Tab Navigator Structure

*For any* render of the Bottom Tab Navigator, it SHALL contain exactly 5 tabs (Home, Stores, Cart, Wishlist, Account), each with an icon and label.

**Validates: Requirements 29.1, 29.2**

### Property 26: Cart Badge Count

*For any* cart state, the Cart tab badge SHALL display the correct item count (sum of quantities), and SHALL be hidden when count is 0.

**Validates: Requirements 29.3**

### Property 27: Active Tab Highlighting

*For any* active tab in the Bottom Tab Navigator, the tab icon and label SHALL use the primary color, while inactive tabs use the gray color.

**Validates: Requirements 29.5**

### Property 28: Product Form Mode Detection

*For any* ProductFormScreen render, when a productId is provided in route params, the form SHALL be in edit mode with pre-filled fields and "Update Product" button; otherwise, it SHALL be in create mode with empty fields and "Create Product" button.

**Validates: Requirements 19.4, 19.5**

### Property 29: Order Cancellation Eligibility

*For any* Order displayed in OrderDetailScreen, the "Cancel Order" button SHALL be visible if and only if the order status is 'pending' or 'processing'.

**Validates: Requirements 11.5**

### Property 30: Accessibility Touch Targets

*For any* interactive element (button, touchable), the minimum touch target size SHALL be 44x44 points.

**Validates: Requirements 32.5**

### Property 31: Color Contrast Compliance

*For any* text-background color combination in the theme, the contrast ratio SHALL meet WCAG AA standards (minimum 4.5:1 for normal text, 3:1 for large text).

**Validates: Requirements 32.3**

### Property 32: Accessibility Labels

*For any* interactive element without visible text, the element SHALL have an accessibilityLabel prop defined.

**Validates: Requirements 32.1**

## Error Handling

### API Error Handling Strategy

All API calls implement consistent error handling with user-friendly messages:

```javascript
const handleApiError = (error, fallbackMessage) => {
  const message = error.response?.data?.message 
    || error.response?.data?.msg 
    || error.message 
    || fallbackMessage;
  
  Toast.show({
    type: 'error',
    text1: 'Error',
    text2: message,
    visibilityTime: 4000,
  });
  
  return { success: false, error: message };
};
```

### Error Scenarios by Feature

1. **Authentication Errors**
   - Invalid credentials: "Invalid email or password"
   - Account not found: "No account found with this email"
   - Network error: "Unable to connect. Please check your internet connection"
   - Server error: "Something went wrong. Please try again"

2. **Cart Errors**
   - Product out of stock: "This product is currently out of stock"
   - Quantity limit: "Maximum quantity reached for this product"
   - Cart sync failed: "Failed to update cart. Please try again"

3. **Order Errors**
   - Payment failed: "Payment could not be processed"
   - Order placement failed: "Failed to place order. Please try again"
   - Order cancellation failed: "Unable to cancel order at this time"

4. **Product Management Errors**
   - Image upload failed: "Failed to upload image. Please try again"
   - Product creation failed: "Failed to create product"
   - Product update failed: "Failed to update product"
   - Product deletion failed: "Failed to delete product"

5. **Store Errors**
   - Store not found: "Store not found"
   - Trust action failed: "Failed to update trust status"
   - Verification failed: "Failed to update verification status"

### Offline Handling

- Display offline banner when network is unavailable
- Cache critical data (user info, cart) in AsyncStorage
- Queue actions for sync when online
- Show cached data with "Last updated" timestamp

## Testing Strategy

### Dual Testing Approach

This implementation uses both unit tests and property-based tests:

- **Unit tests**: Verify specific examples, edge cases, error conditions, and UI rendering
- **Property tests**: Verify universal properties across all valid inputs using fast-check

### Testing Framework

- **Unit Testing**: Jest with React Native Testing Library
- **Property-Based Testing**: fast-check library
- **Minimum iterations**: 100 per property test
- **Mocking**: jest-mock for API calls, AsyncStorage mock

### Test File Structure

```
MobileApp/
├── __tests__/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Loader.test.js
│   │   │   ├── EmptyState.test.js
│   │   │   ├── StatCard.test.js
│   │   │   ├── ActionCard.test.js
│   │   │   └── OrderCard.test.js
│   │   ├── ProductCard.test.js
│   │   ├── ProductCard.property.test.js
│   │   ├── StoreCard.test.js
│   │   └── StoreCard.property.test.js
│   ├── screens/
│   │   ├── HomeScreen.test.js
│   │   ├── CartScreen.test.js
│   │   ├── CartScreen.property.test.js
│   │   ├── CheckoutScreen.test.js
│   │   ├── CheckoutScreen.property.test.js
│   │   ├── OrdersScreen.test.js
│   │   ├── OrdersScreen.property.test.js
│   │   ├── ProfileScreen.test.js
│   │   ├── ProfileScreen.property.test.js
│   │   ├── auth/
│   │   │   ├── LoginScreen.test.js
│   │   │   └── SignUpScreen.test.js
│   │   ├── seller/
│   │   │   ├── SellerDashboardScreen.test.js
│   │   │   ├── SellerDashboardScreen.property.test.js
│   │   │   └── ProductManagementScreen.test.js
│   │   └── admin/
│   │       ├── AdminDashboardScreen.test.js
│   │       ├── AdminDashboardScreen.property.test.js
│   │       ├── AdminUserManagementScreen.test.js
│   │       └── AdminUserManagementScreen.property.test.js
│   ├── contexts/
│   │   ├── AuthContext.test.js
│   │   ├── GlobalContext.test.js
│   │   └── CurrencyContext.test.js
│   ├── navigation/
│   │   └── AppNavigator.test.js
│   └── theme/
│       └── theme.property.test.js
```

### Property Test Annotations

Each property test must be annotated with the design property it validates:

```javascript
// Feature: mobile-app-modernization, Property 1: Theme System Completeness
describe('Theme System', () => {
  test.prop([fc.constant(theme)], { numRuns: 100 })(
    'theme contains all required keys with correct types',
    (themeObj) => {
      // Test implementation
    }
  );
});
```

### Test Data Generators (fast-check Arbitraries)

```javascript
// User arbitrary
const userArbitrary = fc.record({
  _id: fc.hexaString({ minLength: 24, maxLength: 24 }),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  email: fc.emailAddress(),
  role: fc.constantFrom('user', 'seller', 'admin'),
  avatar: fc.option(fc.webUrl()),
});

// Product arbitrary
const productArbitrary = fc.record({
  _id: fc.hexaString({ minLength: 24, maxLength: 24 }),
  name: fc.string({ minLength: 1, maxLength: 200 }),
  description: fc.string({ minLength: 0, maxLength: 1000 }),
  price: fc.float({ min: 0.01, max: 100000, noNaN: true }),
  discountedPrice: fc.option(fc.float({ min: 0.01, max: 100000, noNaN: true })),
  category: fc.string({ minLength: 1, maxLength: 50 }),
  brand: fc.string({ minLength: 1, maxLength: 50 }),
  stock: fc.nat({ max: 10000 }),
  rating: fc.float({ min: 0, max: 5, noNaN: true }),
  isFeatured: fc.boolean(),
});

// Order arbitrary
const orderArbitrary = fc.record({
  _id: fc.hexaString({ minLength: 24, maxLength: 24 }),
  status: fc.constantFrom('pending', 'processing', 'shipped', 'delivered', 'cancelled'),
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
  orderSummary: fc.record({
    subtotal: fc.float({ min: 0, max: 100000, noNaN: true }),
    shippingCost: fc.float({ min: 0, max: 1000, noNaN: true }),
    tax: fc.float({ min: 0, max: 10000, noNaN: true }),
    totalAmount: fc.float({ min: 0, max: 120000, noNaN: true }),
  }),
});

// Store arbitrary
const storeArbitrary = fc.record({
  _id: fc.hexaString({ minLength: 24, maxLength: 24 }),
  storeName: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.option(fc.string({ maxLength: 500 })),
  trustCount: fc.nat({ max: 100000 }),
  verification: fc.record({
    isVerified: fc.boolean(),
    verifiedAt: fc.option(fc.date()),
  }),
});

// Cart item arbitrary
const cartItemArbitrary = fc.record({
  _id: fc.hexaString({ minLength: 24, maxLength: 24 }),
  product: productArbitrary,
  qty: fc.integer({ min: 1, max: 10 }),
});

// Tax config arbitrary
const taxConfigArbitrary = fc.record({
  _id: fc.hexaString({ minLength: 24, maxLength: 24 }),
  region: fc.string({ minLength: 1, maxLength: 50 }),
  rate: fc.float({ min: 0, max: 100, noNaN: true }),
  description: fc.option(fc.string({ maxLength: 200 })),
  isActive: fc.boolean(),
});
```

### Unit Test Focus Areas

1. **Component Rendering**: Verify components render without errors with various props
2. **User Interactions**: Test button presses, form submissions, navigation
3. **Conditional Rendering**: Test different states (loading, empty, error, success)
4. **Form Validation**: Test validation rules and error message display
5. **API Integration**: Test API call triggers and response handling (mocked)
6. **Context Integration**: Test context value consumption and updates

### Property Test Focus Areas

1. **Data Display**: Verify correct data mapping to UI elements
2. **Calculations**: Verify mathematical correctness (totals, percentages)
3. **Filtering/Sorting**: Verify filter and sort logic
4. **State Transitions**: Verify state changes based on actions
5. **Access Control**: Verify role-based visibility and access
6. **Theme Compliance**: Verify theme values and structure
