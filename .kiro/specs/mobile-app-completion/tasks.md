# Implementation Plan: Mobile App Completion

## Overview

This implementation plan covers adding missing features to the MobileApp to achieve feature parity with the web Frontend. The implementation follows the existing React Native/Expo patterns and leverages the already-implemented Backend APIs.

## Tasks

- [x] 1. Set up project foundation and extend API configuration
  - [x] 1.1 Extend API endpoints configuration in api.js
    - Add SPIN, TRUST, and CURRENCY endpoint definitions
    - Add BECOME_SELLER endpoint to USER section
    - _Requirements: 1.1-1.7, 2.1-2.5, 5.1-5.4_
  - [x] 1.2 Install required dependencies
    - Add react-native-svg for wheel rendering
    - Add fast-check for property-based testing
    - _Requirements: 1.1_

- [x] 2. Implement VerifiedBadge component
  - [x] 2.1 Create VerifiedBadge component
    - Implement size variants (sm, md, lg)
    - Use Ionicons checkmark-circle icon
    - Match web Frontend blue color scheme
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 2.2 Write property test for VerifiedBadge visibility
    - **Property 9: Verified Badge Visibility**
    - **Validates: Requirements 3.1, 3.2**

- [x] 3. Implement TrustButton component
  - [x] 3.1 Create TrustButton component
    - Implement compact and full modes
    - Add trust/untrust toggle functionality
    - Handle loading and error states
    - Integrate with trust API endpoints
    - _Requirements: 2.1, 2.2, 2.3, 2.5_
  - [x] 3.2 Write property test for trust state toggle
    - **Property 7: Trust State Toggle**
    - **Validates: Requirements 2.2, 2.3**
  - [x] 3.3 Write property test for trust error rollback
    - **Property 8: Trust Error Rollback**
    - **Validates: Requirements 2.5**

- [x] 4. Checkpoint - Verify base components
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement SpinWheel component
  - [x] 5.1 Create SpinWheel component with SVG wheel
    - Implement 6 segments with colors and labels
    - Add wheel rotation animation using Animated API
    - Implement spin button with disabled states
    - Add result display after spin completes
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 5.2 Write property test for spin wheel segments
    - **Property 1: Spin Wheel Segment Rendering**
    - **Validates: Requirements 1.1**
  - [x] 5.3 Write property test for spin result callback
    - **Property 2: Spin Result Callback Invocation**
    - **Validates: Requirements 1.3**

- [x] 6. Implement SpinBanner component
  - [x] 6.1 Create SpinBanner component
    - Implement "Spin to Win" CTA state (no spin result)
    - Implement active spin state with discount display
    - Implement checked out state with countdown
    - Add product selection count display
    - _Requirements: 1.7_
  - [x] 6.2 Write property test for banner conditional display
    - **Property 6: Spin Banner Conditional Display**
    - **Validates: Requirements 1.7**

- [x] 7. Implement SpinWheelScreen
  - [x] 7.1 Create SpinWheelScreen
    - Integrate SpinWheel and SpinBanner components
    - Implement spin result saving to API
    - Add cooldown logic and display
    - Handle product selection flow
    - _Requirements: 1.1-1.7_
  - [x] 7.2 Write property test for cooldown enforcement
    - **Property 5: Spin Cooldown Enforcement**
    - **Validates: Requirements 1.6**
  - [x] 7.3 Write property test for product selection availability
    - **Property 3: Spin Product Selection Availability**
    - **Validates: Requirements 1.4**

- [x] 8. Checkpoint - Verify spin wheel feature
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement CurrencySelector component
  - [x] 9.1 Create CurrencySelector modal component
    - Display list of available currencies (USD, EUR, GBP, PKR)
    - Handle currency selection and persistence
    - Integrate with CurrencyContext
    - _Requirements: 5.1, 5.2_
  - [x] 9.2 Write property test for currency persistence
    - **Property 12: Currency Selection Persistence**
    - **Validates: Requirements 5.2, 5.4**

- [x] 10. Enhance CurrencyContext
  - [x] 10.1 Update CurrencyContext with full functionality
    - Add formatPrice function with currency symbol
    - Implement currency persistence to AsyncStorage
    - Add currency restoration on app load
    - _Requirements: 5.2, 5.3, 5.4_
  - [x] 10.2 Write property test for price formatting
    - **Property 13: Price Formatting Consistency**
    - **Validates: Requirements 5.3**

- [x] 11. Implement TrustedStoresScreen
  - [x] 11.1 Create TrustedStoresScreen
    - Fetch trusted stores from API
    - Display stores in scrollable list with StoreCard
    - Integrate TrustButton and VerifiedBadge
    - Handle empty state
    - Implement navigation to store page on tap
    - _Requirements: 6.1-6.5_
  - [x] 11.2 Write property test for trusted stores list rendering
    - **Property 14: Trusted Stores List Rendering**
    - **Validates: Requirements 6.2**
  - [x] 11.3 Write property test for list update on untrust
    - **Property 15: Trusted Stores List Update on Untrust**
    - **Validates: Requirements 6.5**

- [x] 12. Checkpoint - Verify trust and currency features
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Implement BecomeSellerScreen
  - [x] 13.1 Create BecomeSellerScreen
    - Display benefits and features section
    - Implement seller application form
    - Add form validation (phone, address, city, country)
    - Handle API submission and success/error states
    - Implement redirect for existing sellers
    - _Requirements: 4.1-4.5_
  - [x] 13.2 Write property test for seller role redirect
    - **Property 10: Seller Role Redirect**
    - **Validates: Requirements 4.5**
  - [x] 13.3 Write property test for seller application error handling
    - **Property 11: Seller Application Error Handling**
    - **Validates: Requirements 4.4**

- [x] 14. Implement StoreVerificationScreen (Admin)
  - [x] 14.1 Create StoreVerificationScreen
    - Fetch all stores with verification status
    - Display stores in list with verify/unverify buttons
    - Handle verification API calls
    - Implement access control for admin only
    - _Requirements: 8.1-8.4_
  - [x] 14.2 Write property test for admin store verification list
    - **Property 17: Admin Store Verification List**
    - **Validates: Requirements 8.1**
  - [x] 14.3 Write property test for admin access control
    - **Property 18: Admin Access Control**
    - **Validates: Requirements 8.4**

- [x] 15. Checkpoint - Verify seller and admin features
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Update existing screens with new components
  - [x] 16.1 Update StoreScreen with TrustButton and VerifiedBadge
    - Add TrustButton to store header
    - Add VerifiedBadge next to store name
    - _Requirements: 2.1, 3.1_
  - [x] 16.2 Update StoresListingScreen with VerifiedBadge
    - Add VerifiedBadge to store cards
    - _Requirements: 3.1_
  - [x] 16.3 Update HomeScreen with SpinBanner
    - Add SpinBanner at top of home screen
    - Integrate with spin result state
    - _Requirements: 1.7_
  - [x] 16.4 Update ProfileScreen with new navigation options
    - Add Trusted Stores link
    - Add Become Seller link (for non-sellers)
    - Add Currency Selector access
    - _Requirements: 7.2, 7.3, 7.4_

- [x] 17. Update navigation with new screens
  - [x] 17.1 Update AppNavigator with new routes
    - Add SpinWheelScreen route
    - Add TrustedStoresScreen route
    - Add BecomeSellerScreen route
    - Add StoreVerificationScreen to admin stack
    - _Requirements: 7.1, 7.2, 7.3_
  - [x] 17.2 Write property test for become seller entry point visibility
    - **Property 16: Become Seller Entry Point Visibility**
    - **Validates: Requirements 7.3**

- [x] 18. Extend GlobalContext with spin functionality
  - [x] 18.1 Add spin state management to GlobalContext
    - Add spinResult state
    - Add fetchActiveSpin function
    - Add saveSpinResult function
    - Add selectSpinProducts function
    - Add checkoutSpin function
    - _Requirements: 1.3, 1.4, 1.5_
  - [x] 18.2 Write property test for spin product selection persistence
    - **Property 4: Spin Product Selection Persistence**
    - **Validates: Requirements 1.5**

- [x] 19. Final checkpoint - Full integration testing
  - All 44 property tests pass successfully
  - All navigation flows verified
  - All components have no diagnostics issues
  - Jest test configuration fixed and working

## Notes

- All tasks including property tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- All new screens follow existing MobileApp patterns and styling
