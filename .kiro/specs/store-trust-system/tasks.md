# Implementation Plan: Store Trust System

- [x] 1. Create StoreTrust model and update Store model
  - Create new StoreTrust model with user and store references
  - Add compound unique index on user and store fields
  - Add trustCount field to Store model with default value 0 and minimum constraint
  - Add indexes for query optimization
  - _Requirements: 1.3, 1.4, 5.1, 5.2_

- [x] 1.1 Write property test for StoreTrust model
  - **Property 1: Trust relationship creation**
  - **Validates: Requirements 1.3, 5.1**

- [x] 1.2 Write property test for trust relationship removal
  - **Property 2: Trust relationship removal**
  - **Validates: Requirements 1.4, 5.2**

- [x] 2. Implement trust controller with core operations
  - Create trustStore function to create trust relationships
  - Create untrustStore function to remove trust relationships
  - Create getTrustStatus function to check if user trusts a store
  - Create getTrustedStores function to get all stores a user trusts
  - Implement atomic increment/decrement for trustCount
  - Add input validation and error handling
  - _Requirements: 1.3, 1.4, 2.2, 5.1, 5.2, 5.4_

- [x] 2.1 Write property test for trust count increment
  - **Property 3: Trust count increment on trust**
  - **Validates: Requirements 4.2**

- [x] 2.2 Write property test for trust count decrement
  - **Property 4: Trust count decrement on untrust**
  - **Validates: Requirements 4.3**

- [x] 2.3 Write property test for trust count accuracy
  - **Property 5: Trust count accuracy**
  - **Validates: Requirements 1.2, 4.1**

- [x] 2.4 Write property test for trust count non-negativity
  - **Property 6: Trust count non-negativity**
  - **Validates: Requirements 4.4**

- [x] 2.5 Write property test for idempotent trust operations
  - **Property 12: Idempotent trust operations**
  - **Validates: Requirements 1.3 (error case)**

- [x] 2.6 Write property test for idempotent untrust operations
  - **Property 13: Idempotent untrust operations**
  - **Validates: Requirements 1.4 (error case)**

- [x] 3. Create trust API routes
  - Create POST /api/stores/:storeId/trust route for trusting stores
  - Create DELETE /api/stores/:storeId/trust route for untrusting stores
  - Create GET /api/stores/:storeId/trust-status route for checking trust status
  - Create GET /api/stores/trusted route for getting user's trusted stores
  - Add authentication middleware to all routes
  - Wire routes to trust controller functions
  - _Requirements: 1.3, 1.4, 2.2, 3.1_

- [x] 3.1 Write unit tests for trust API endpoints
  - Test POST /api/stores/:storeId/trust with valid data
  - Test DELETE /api/stores/:storeId/trust with valid data
  - Test GET /api/stores/:storeId/trust-status
  - Test GET /api/stores/trusted
  - Test authentication requirements
  - Test error cases (404, 400, 401)

- [x] 4. Update Store controller to include trust count in responses
  - Modify getStores endpoint to include trustCount field
  - Modify getStoreBySlug endpoint to include trustCount field
  - Ensure trustCount is returned in all store queries
  - _Requirements: 1.2, 4.1_

- [x] 5. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Create TrustButton component for Frontend
  - Create TrustButton component with props for storeId, storeName, initialTrustCount, initialIsTrusted
  - Implement handleTrustToggle function to call trust/untrust API
  - Add loading state during API calls
  - Add optimistic UI updates
  - Display trust count next to button
  - Show visual indicator for trusted/untrusted state
  - Handle errors with toast notifications
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.4_

- [x] 6.1 Write property test for trust status display consistency
  - **Property 9: Trust status display consistency**
  - **Validates: Requirements 3.1, 3.3**

- [x] 6.2 Write property test for UI state synchronization
  - **Property 10: UI state synchronization**
  - **Validates: Requirements 3.4**

- [x] 7. Integrate TrustButton into Store page
  - Add TrustButton component to Store page
  - Fetch initial trust status when page loads
  - Pass store data to TrustButton component
  - Position button prominently with store name
  - _Requirements: 1.1, 1.2, 3.1, 3.2_

- [x] 8. Create TrustedStoresList component for Frontend
  - Create TrustedStoresList component
  - Implement fetchTrustedStores function to call API
  - Display list of trusted stores with name, logo, and trust count
  - Add loading state and error handling
  - Implement empty state message when no stores are trusted
  - Add navigation to store page on store click
  - _Requirements: 2.2, 2.3, 2.4_

- [x] 8.1 Write property test for trusted stores list completeness
  - **Property 7: Trusted stores list completeness**
  - **Validates: Requirements 2.2**

- [x] 8.2 Write property test for trusted stores list data integrity
  - **Property 8: Trusted stores list data integrity**
  - **Validates: Requirements 2.3**

- [x] 9. Add "My Trusted Stores" button to Discover Stores page
  - Add button to Discover Stores page to view trusted stores
  - Implement navigation to TrustedStoresList view
  - Position button prominently on the page
  - _Requirements: 2.1_

- [x] 10. Add trust status indicators to Discover Stores page
  - Display trust status indicator on each store card
  - Show which stores the user has trusted
  - Update indicators when trust status changes
  - _Requirements: 3.3_

- [x] 11. Create TrustButton component for Mobile App
  - Create TrustButton component for React Native
  - Implement same functionality as web version
  - Use React Native styling and components
  - Add TouchableOpacity for button interaction
  - Display trust count and visual indicators
  - Handle errors with Toast messages
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.4_

- [x] 12. Integrate TrustButton into Mobile Store screen
  - Add TrustButton to StoreScreen component
  - Fetch initial trust status on screen load
  - Position button in store header
  - _Requirements: 1.1, 1.2, 3.1, 3.2_

- [x] 13. Create TrustedStoresScreen for Mobile App
  - Create new screen to display trusted stores
  - Implement FlatList to render trusted stores
  - Add pull-to-refresh functionality
  - Display empty state when no stores are trusted
  - Add navigation to StoreScreen on store press
  - _Requirements: 2.2, 2.3, 2.4_

- [x] 14. Add "My Trusted Stores" navigation to Mobile App
  - Add button or tab to access TrustedStoresScreen
  - Update navigation stack to include new screen
  - Add appropriate icon and label
  - _Requirements: 2.1_

- [x] 15. Add trust indicators to Mobile StoresListingScreen
  - Display trust status on each store card
  - Show visual indicator for trusted stores
  - Update indicators when trust status changes
  - _Requirements: 3.3_

- [x] 16. Write property test for concurrent trust operations
  - **Property 11: Concurrent trust operations**
  - **Validates: Requirements 5.4**

- [x] 17. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
