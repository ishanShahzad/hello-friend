# Requirements Document

## Introduction

This document specifies the requirements for completing the MobileApp to achieve feature parity with the web Frontend. The mobile app is currently missing several critical features including the Spin Wheel promotional system, Store Trust system, Become Seller flow, Verified Badge display, Trusted Stores listing, and Currency Selection. These features already exist in the Backend API and web Frontend but have not been implemented in the mobile application.

## Glossary

- **MobileApp**: The React Native/Expo mobile application for iOS and Android
- **Spin_Wheel**: A promotional feature allowing users to spin a wheel for discounts on products
- **Trust_System**: A feature allowing users to mark stores as trusted and view their trusted stores
- **Verified_Badge**: A visual indicator showing that a store has been verified by administrators
- **Seller_Application**: The process by which a regular user applies to become a seller on the platform
- **Currency_Selector**: A component allowing users to select their preferred currency for price display
- **API_Client**: The module responsible for making HTTP requests to the Backend API

## Requirements

### Requirement 1: Spin Wheel Feature

**User Story:** As a user, I want to spin a promotional wheel on the mobile app, so that I can win discounts on products.

#### Acceptance Criteria

1. WHEN a user navigates to the Spin Wheel screen, THE MobileApp SHALL display an interactive spinning wheel with discount segments
2. WHEN a user taps the spin button, THE MobileApp SHALL animate the wheel rotation and determine a random result
3. WHEN the wheel stops spinning, THE MobileApp SHALL display the won discount and save the result via the API
4. WHEN a user has an active spin result, THE MobileApp SHALL allow them to select products to apply the discount
5. WHEN a user selects products for their spin discount, THE MobileApp SHALL persist the selection via the API
6. IF a user has already spun within the cooldown period, THEN THE MobileApp SHALL display the remaining cooldown time and prevent spinning
7. WHEN a user has spin products ready, THE MobileApp SHALL display a banner prompting them to checkout

### Requirement 2: Store Trust System

**User Story:** As a user, I want to mark stores as trusted on the mobile app, so that I can easily find and support my favorite stores.

#### Acceptance Criteria

1. WHEN viewing a store page, THE MobileApp SHALL display a Trust button allowing users to trust or untrust the store
2. WHEN a user taps the Trust button on an untrusted store, THE MobileApp SHALL call the trust API and update the UI to show trusted status
3. WHEN a user taps the Trust button on a trusted store, THE MobileApp SHALL call the untrust API and update the UI to show untrusted status
4. WHEN a user navigates to the Trusted Stores screen, THE MobileApp SHALL fetch and display all stores the user has marked as trusted
5. WHEN the trust API call fails, THE MobileApp SHALL display an error message and maintain the previous trust state

### Requirement 3: Verified Badge Display

**User Story:** As a user, I want to see which stores are verified on the mobile app, so that I can identify trustworthy sellers.

#### Acceptance Criteria

1. WHEN displaying a store card or store page, THE MobileApp SHALL show a Verified Badge if the store is verified
2. WHEN a store is not verified, THE MobileApp SHALL NOT display the Verified Badge
3. THE Verified_Badge SHALL be visually consistent with the web Frontend design

### Requirement 4: Become Seller Flow

**User Story:** As a user, I want to apply to become a seller through the mobile app, so that I can start selling products on the platform.

#### Acceptance Criteria

1. WHEN a non-seller user navigates to the Become Seller screen, THE MobileApp SHALL display a seller application form
2. WHEN a user submits the seller application form, THE MobileApp SHALL call the become-seller API endpoint
3. WHEN the seller application is successful, THE MobileApp SHALL update the user's role and navigate to the Seller Dashboard
4. IF the seller application fails, THEN THE MobileApp SHALL display an appropriate error message
5. WHEN a user is already a seller, THE MobileApp SHALL redirect them to the Seller Dashboard instead of showing the application form

### Requirement 5: Currency Selection

**User Story:** As a user, I want to select my preferred currency on the mobile app, so that I can view prices in my local currency.

#### Acceptance Criteria

1. WHEN a user opens the Currency Selector, THE MobileApp SHALL display a list of available currencies
2. WHEN a user selects a currency, THE MobileApp SHALL persist the selection and update all displayed prices
3. THE MobileApp SHALL display prices in the selected currency throughout the application
4. WHEN the app loads, THE MobileApp SHALL restore the previously selected currency preference

### Requirement 6: Trusted Stores Screen

**User Story:** As a user, I want to view all my trusted stores in one place on the mobile app, so that I can quickly access stores I trust.

#### Acceptance Criteria

1. WHEN a user navigates to the Trusted Stores screen, THE MobileApp SHALL fetch the list of trusted stores from the API
2. WHEN trusted stores are loaded, THE MobileApp SHALL display them in a scrollable list with store cards
3. WHEN a user taps on a trusted store card, THE MobileApp SHALL navigate to that store's page
4. WHEN a user has no trusted stores, THE MobileApp SHALL display an empty state message
5. WHEN the user untrusts a store from this screen, THE MobileApp SHALL remove it from the list

### Requirement 7: Navigation Integration

**User Story:** As a user, I want to easily access all new features through the app navigation, so that I can discover and use them.

#### Acceptance Criteria

1. THE MobileApp SHALL add a Spin Wheel entry point accessible from the home screen or navigation
2. THE MobileApp SHALL add a Trusted Stores entry point in the profile or navigation menu
3. THE MobileApp SHALL add a Become Seller entry point for non-seller users in the profile screen
4. THE MobileApp SHALL integrate the Currency Selector in an accessible location (header or settings)

### Requirement 8: Store Verification Admin Screen

**User Story:** As an admin, I want to manage store verifications from the mobile app, so that I can verify or unverify stores on the go.

#### Acceptance Criteria

1. WHEN an admin navigates to the Store Verification screen, THE MobileApp SHALL display a list of all stores with their verification status
2. WHEN an admin taps to verify a store, THE MobileApp SHALL call the verification API and update the store's status
3. WHEN an admin taps to unverify a store, THE MobileApp SHALL call the unverification API and update the store's status
4. THE Store Verification screen SHALL only be accessible to admin users
