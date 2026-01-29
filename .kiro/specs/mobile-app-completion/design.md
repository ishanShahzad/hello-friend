# Design Document: Mobile App Completion

## Overview

This design document outlines the implementation of missing features in the MobileApp to achieve feature parity with the web Frontend. The mobile app is built with React Native/Expo and follows the existing patterns established in the codebase. All features leverage existing Backend APIs that are already implemented and tested.

The implementation will add:
1. Spin Wheel promotional feature
2. Store Trust system with trust/untrust functionality
3. Verified Badge component for stores
4. Become Seller application flow
5. Currency Selection feature
6. Trusted Stores dedicated screen
7. Store Verification admin screen
8. Navigation integration for all new features

## Architecture

```mermaid
graph TB
    subgraph "MobileApp Architecture"
        subgraph "Navigation"
            AppNavigator[AppNavigator.js]
            MainTabs[Main Tab Navigator]
            AuthStack[Auth Stack]
            AdminStack[Admin Stack]
            SellerStack[Seller Stack]
        end
        
        subgraph "New Screens"
            SpinWheelScreen[SpinWheelScreen]
            TrustedStoresScreen[TrustedStoresScreen]
            BecomeSellerScreen[BecomeSellerScreen]
            StoreVerificationScreen[StoreVerificationScreen]
        end
        
        subgraph "New Components"
            SpinWheel[SpinWheel Component]
            SpinBanner[SpinBanner Component]
            TrustButton[TrustButton Component]
            VerifiedBadge[VerifiedBadge Component]
            CurrencySelector[CurrencySelector Component]
        end
        
        subgraph "Contexts"
            GlobalContext[GlobalContext - Extended]
            CurrencyContext[CurrencyContext - Enhanced]
            AuthContext[AuthContext - Existing]
        end
        
        subgraph "API Layer"
            ApiConfig[api.js - Extended]
        end
    end
    
    subgraph "Backend APIs"
        SpinAPI[/api/spin/*]
        TrustAPI[/api/stores/:id/trust*]
        UserAPI[/api/user/become-seller]
        StoreAPI[/api/stores/*]
        CurrencyAPI[/api/currency/*]
    end
    
    AppNavigator --> MainTabs
    AppNavigator --> AuthStack
    AppNavigator --> AdminStack
    AppNavigator --> SellerStack
    
    MainTabs --> SpinWheelScreen
    MainTabs --> TrustedStoresScreen
    MainTabs --> BecomeSellerScreen
    AdminStack --> StoreVerificationScreen
    
    SpinWheelScreen --> SpinWheel
    SpinWheelScreen --> SpinBanner
    TrustedStoresScreen --> TrustButton
    TrustedStoresScreen --> VerifiedBadge
    
    SpinWheel --> GlobalContext
    TrustButton --> GlobalContext
    CurrencySelector --> CurrencyContext
    
    GlobalContext --> ApiConfig
    CurrencyContext --> ApiConfig
    
    ApiConfig --> SpinAPI
    ApiConfig --> TrustAPI
    ApiConfig --> UserAPI
    ApiConfig --> StoreAPI
    ApiConfig --> CurrencyAPI
```

## Components and Interfaces

### 1. SpinWheel Component

A React Native component that renders an interactive spinning wheel with animated rotation.

```javascript
// MobileApp/src/components/SpinWheel.js
interface SpinWheelProps {
  onSpinComplete: (result: SpinResult) => void;
  onClose: () => void;
}

interface SpinResult {
  label: string;
  value: number;
  type: 'percentage' | 'fixed' | 'free';
}

interface SpinSegment {
  label: string;
  color: string;
  value: number;
  type: 'percentage' | 'fixed' | 'free';
}
```

Implementation approach:
- Use React Native's `Animated` API for wheel rotation
- SVG rendering via `react-native-svg` for wheel segments
- 6 segments matching web Frontend: 40% OFF, FREE, 60% OFF, $0.99, 80% OFF, 99% OFF
- Target segments for winning: "All products FREE" and "All products $0.99"
- 5-second spin animation with easing

### 2. SpinBanner Component

A banner component showing spin status and prompting user actions.

```javascript
// MobileApp/src/components/SpinBanner.js
interface SpinBannerProps {
  spinResult: SpinResult | null;
  selectedCount: number;
  onOpenSpinner: () => void;
}
```

States:
- No spin result: Show "Spin to Win" CTA
- Active spin (not checked out): Show won discount and selection count
- Checked out: Show winner status and next spin countdown

### 3. TrustButton Component

A button component for trusting/untrusting stores.

```javascript
// MobileApp/src/components/TrustButton.js
interface TrustButtonProps {
  storeId: string;
  storeName: string;
  initialTrustCount?: number;
  initialIsTrusted?: boolean;
  compact?: boolean;
  onTrustChange?: (isTrusted: boolean, trustCount: number) => void;
}
```

Features:
- Compact mode for store cards (small button)
- Full mode for store pages (button + trust count)
- Optimistic UI updates with rollback on error
- Loading state during API calls

### 4. VerifiedBadge Component

A visual indicator for verified stores.

```javascript
// MobileApp/src/components/VerifiedBadge.js
interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}
```

Implementation:
- Use Ionicons `checkmark-circle` icon
- Blue color (#007AFF) matching iOS design
- Three size variants: sm (16px), md (20px), lg (24px)

### 5. CurrencySelector Component

A modal/dropdown for selecting display currency.

```javascript
// MobileApp/src/components/CurrencySelector.js
interface CurrencySelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (currency: string) => void;
  currentCurrency: string;
}

interface Currency {
  code: string;
  symbol: string;
  name: string;
}
```

Supported currencies: USD, EUR, GBP, PKR (matching web Frontend)

## Data Models

### SpinResult Model (matches Backend)

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

### StoreTrust Model (matches Backend)

```javascript
interface StoreTrust {
  _id: string;
  user: string;
  store: string;
  createdAt: Date;
}
```

### Store Model Extension

```javascript
interface Store {
  // ... existing fields
  trustCount: number;
  verification: {
    isVerified: boolean;
    verifiedAt?: Date;
    verifiedBy?: string;
  };
}
```

### API Endpoints Configuration

```javascript
// Extended API_ENDPOINTS in api.js
export const API_ENDPOINTS = {
  // ... existing endpoints
  SPIN: {
    SAVE_RESULT: '/api/spin/save-result',
    GET_ACTIVE: '/api/spin/get-active',
    ADD_PRODUCTS: '/api/spin/add-products',
    CHECKOUT: '/api/spin/checkout',
    CAN_ADD_TO_CART: '/api/spin/can-add-to-cart',
  },
  TRUST: {
    TRUST_STORE: '/api/stores/:storeId/trust',
    UNTRUST_STORE: '/api/stores/:storeId/trust',
    GET_STATUS: '/api/stores/:storeId/trust-status',
    GET_TRUSTED: '/api/stores/trusted',
  },
  USER: {
    // ... existing
    BECOME_SELLER: '/api/user/become-seller',
  },
  CURRENCY: {
    GET_RATES: '/api/currency/get-rates',
  },
};
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Spin Wheel Segment Rendering

*For any* SpinWheel component render, the wheel SHALL contain exactly 6 segments, and each segment SHALL have a valid label, color, value, and type property.

**Validates: Requirements 1.1**

### Property 2: Spin Result Callback Invocation

*For any* completed spin animation, the onSpinComplete callback SHALL be invoked with a SpinResult object containing a valid label, value (number), and type ('percentage' | 'fixed' | 'free').

**Validates: Requirements 1.3**

### Property 3: Spin Product Selection Availability

*For any* active spin result that has not been checked out, the product selection functionality SHALL be enabled, allowing users to select up to 3 products.

**Validates: Requirements 1.4**

### Property 4: Spin Product Selection Persistence

*For any* product selection action on an active spin, the API call SHALL be made with the correct product IDs array, and the local state SHALL reflect the updated selection.

**Validates: Requirements 1.5**

### Property 5: Spin Cooldown Enforcement

*For any* spin result created within the last 24 hours, the spin button SHALL be disabled and the remaining cooldown time SHALL be displayed as a non-negative duration.

**Validates: Requirements 1.6**

### Property 6: Spin Banner Conditional Display

*For any* active spin result with selected products that has not been checked out, the SpinBanner SHALL display the checkout prompt with the correct discount information.

**Validates: Requirements 1.7**

### Property 7: Trust State Toggle

*For any* store and authenticated user, tapping the Trust button SHALL toggle the trust state: if currently untrusted, it becomes trusted (and vice versa), and the trust count SHALL be updated accordingly.

**Validates: Requirements 2.2, 2.3**

### Property 8: Trust Error Rollback

*For any* failed trust/untrust API call, the UI SHALL maintain the previous trust state and display an error message.

**Validates: Requirements 2.5**

### Property 9: Verified Badge Visibility

*For any* store object, the VerifiedBadge component SHALL be visible if and only if store.verification.isVerified is true.

**Validates: Requirements 3.1, 3.2**

### Property 10: Seller Role Redirect

*For any* user with role 'seller' or 'admin' navigating to the Become Seller screen, the app SHALL redirect to the appropriate dashboard instead of showing the application form.

**Validates: Requirements 4.5**

### Property 11: Seller Application Error Handling

*For any* failed become-seller API call, the app SHALL display an error message and maintain the current user state without role change.

**Validates: Requirements 4.4**

### Property 12: Currency Selection Persistence

*For any* currency selection, the selected currency SHALL be persisted to AsyncStorage, and upon app reload, the same currency SHALL be restored as the active selection.

**Validates: Requirements 5.2, 5.4**

### Property 13: Price Formatting Consistency

*For any* price value and selected currency, the formatPrice function SHALL return a string containing the correct currency symbol and properly formatted number.

**Validates: Requirements 5.3**

### Property 14: Trusted Stores List Rendering

*For any* non-empty array of trusted stores returned from the API, all stores SHALL be rendered in the list with their store name, logo, and trust count visible.

**Validates: Requirements 6.2**

### Property 15: Trusted Stores List Update on Untrust

*For any* untrust action performed from the Trusted Stores screen, the untrusted store SHALL be immediately removed from the displayed list.

**Validates: Requirements 6.5**

### Property 16: Become Seller Entry Point Visibility

*For any* user with role 'user' (not seller or admin), the Become Seller entry point SHALL be visible in the profile screen navigation.

**Validates: Requirements 7.3**

### Property 17: Admin Store Verification List

*For any* list of stores fetched for the admin verification screen, each store SHALL display its current verification status (verified or unverified).

**Validates: Requirements 8.1**

### Property 18: Admin Access Control

*For any* user with role other than 'admin', attempting to access the Store Verification screen SHALL result in access denial or redirect.

**Validates: Requirements 8.4**

## Error Handling

### API Error Handling Strategy

All API calls will implement consistent error handling:

```javascript
const handleApiError = (error, fallbackMessage) => {
  const message = error.response?.data?.message 
    || error.response?.data?.msg 
    || error.message 
    || fallbackMessage;
  
  Toast.show({
    type: 'error',
    text1: 'Error',
    text2: message
  });
  
  return { success: false, error: message };
};
```

### Specific Error Scenarios

1. **Spin Wheel Errors**
   - Already spun today: Display cooldown message with remaining time
   - Network error during spin save: Allow retry, don't lose result locally
   - Product selection limit exceeded: Show "Maximum 3 products" message

2. **Trust System Errors**
   - Already trusted: Update UI to show trusted state
   - Not authenticated: Prompt login
   - Store not found: Show "Store unavailable" message

3. **Become Seller Errors**
   - Validation errors: Highlight invalid fields
   - Already a seller: Redirect to dashboard
   - Server error: Show generic error with retry option

4. **Currency Errors**
   - Failed to fetch rates: Use cached rates or default to USD
   - Invalid currency code: Fall back to USD

### Offline Handling

- Cache last known spin result in AsyncStorage
- Cache trusted stores list for offline viewing
- Queue trust/untrust actions for sync when online
- Show offline indicator when network unavailable

## Testing Strategy

### Dual Testing Approach

This implementation uses both unit tests and property-based tests for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all valid inputs

### Testing Framework

- **Unit Testing**: Jest with React Native Testing Library
- **Property-Based Testing**: fast-check library
- **Minimum iterations**: 100 per property test

### Test File Structure

```
MobileApp/
├── __tests__/
│   ├── components/
│   │   ├── SpinWheel.test.js
│   │   ├── SpinWheel.property.test.js
│   │   ├── TrustButton.test.js
│   │   ├── TrustButton.property.test.js
│   │   ├── VerifiedBadge.test.js
│   │   ├── VerifiedBadge.property.test.js
│   │   └── CurrencySelector.test.js
│   ├── screens/
│   │   ├── SpinWheelScreen.test.js
│   │   ├── TrustedStoresScreen.test.js
│   │   ├── BecomeSellerScreen.test.js
│   │   └── StoreVerificationScreen.test.js
│   └── utils/
│       ├── currency.test.js
│       └── currency.property.test.js
```

### Property Test Annotations

Each property test must be annotated with the design property it validates:

```javascript
// Feature: mobile-app-completion, Property 9: Verified Badge Visibility
test.prop([storeArbitrary], { numRuns: 100 })('badge visibility matches isVerified', (store) => {
  // Test implementation
});
```

### Unit Test Focus Areas

1. **Component Rendering**: Verify components render without errors
2. **User Interactions**: Test button presses, form submissions
3. **Navigation**: Verify correct screen transitions
4. **Error States**: Test error message display
5. **Loading States**: Verify loading indicators
6. **Empty States**: Test empty list handling

### Property Test Focus Areas

1. **State Transitions**: Trust toggle, spin state changes
2. **Data Transformations**: Price formatting, cooldown calculations
3. **Conditional Rendering**: Badge visibility, entry point visibility
4. **Persistence**: Currency selection round-trip
5. **Access Control**: Admin-only screen access

### Test Data Generators (fast-check Arbitraries)

```javascript
// Store arbitrary
const storeArbitrary = fc.record({
  _id: fc.hexaString({ minLength: 24, maxLength: 24 }),
  storeName: fc.string({ minLength: 1, maxLength: 100 }),
  trustCount: fc.nat({ max: 10000 }),
  verification: fc.record({
    isVerified: fc.boolean(),
    verifiedAt: fc.option(fc.date()),
  }),
});

// Spin result arbitrary
const spinResultArbitrary = fc.record({
  discount: fc.integer({ min: 1, max: 100 }),
  discountType: fc.constantFrom('percentage', 'fixed', 'free'),
  label: fc.string({ minLength: 1, maxLength: 50 }),
  selectedProducts: fc.array(fc.hexaString({ minLength: 24, maxLength: 24 }), { maxLength: 3 }),
  hasCheckedOut: fc.boolean(),
  expiresAt: fc.date({ min: new Date(), max: new Date(Date.now() + 48 * 60 * 60 * 1000) }),
});

// User arbitrary
const userArbitrary = fc.record({
  _id: fc.hexaString({ minLength: 24, maxLength: 24 }),
  role: fc.constantFrom('user', 'seller', 'admin'),
  email: fc.emailAddress(),
});

// Currency arbitrary
const currencyArbitrary = fc.constantFrom('USD', 'EUR', 'GBP', 'PKR');

// Price arbitrary
const priceArbitrary = fc.float({ min: 0, max: 100000, noNaN: true });
```
