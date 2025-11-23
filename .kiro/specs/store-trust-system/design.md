# Design Document: Store Trust System

## Overview

The Store Trust System enables users to express confidence in stores through a "trust" mechanism, similar to following on social media. This feature creates a many-to-many relationship between users and stores, allowing users to curate a personalized list of trusted stores while providing social proof through trust counts. The system is designed to integrate seamlessly with the existing MERN stack architecture, utilizing MongoDB for data persistence, Express.js for API endpoints, and React/React Native for the user interface.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend/Mobile App                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Store Page Component                                  │ │
│  │  - Trust Button                                        │ │
│  │  - Trust Count Display                                 │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Discover Stores Component                             │ │
│  │  - "My Trusted Stores" Button                          │ │
│  │  - Trust Status Indicators                             │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Trusted Stores List Component                         │ │
│  │  - List of Trusted Stores                              │ │
│  │  - Empty State                                         │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                      Backend API                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Trust Routes                                          │ │
│  │  - POST   /api/stores/:storeId/trust                   │ │
│  │  - DELETE /api/stores/:storeId/trust                   │ │
│  │  - GET    /api/stores/:storeId/trust-status            │ │
│  │  - GET    /api/stores/trusted                          │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Trust Controller                                      │ │
│  │  - trustStore()                                        │ │
│  │  - untrustStore()                                      │ │
│  │  - getTrustStatus()                                    │ │
│  │  - getTrustedStores()                                  │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Auth Middleware                                       │ │
│  │  - Verify JWT Token                                    │ │
│  │  - Extract User ID                                     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓ Mongoose
┌─────────────────────────────────────────────────────────────┐
│                      MongoDB Database                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  StoreTrust Collection                                 │ │
│  │  - user (ObjectId ref User)                            │ │
│  │  - store (ObjectId ref Store)                          │ │
│  │  - createdAt (Date)                                    │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Store Collection (existing)                           │ │
│  │  - trustCount (Number) [NEW FIELD]                     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

#### Trust Store Flow
```
User clicks Trust Button
        ↓
Frontend: POST /api/stores/:storeId/trust
        ↓
Backend: Verify JWT token
        ↓
Backend: Check if trust relationship exists
        ↓
Backend: Create StoreTrust document
        ↓
Backend: Increment Store.trustCount
        ↓
Backend: Return updated trust status
        ↓
Frontend: Update UI (button state, count)
        ↓
User sees updated trust status ✅
```

#### Untrust Store Flow
```
User clicks Trust Button (already trusted)
        ↓
Frontend: DELETE /api/stores/:storeId/trust
        ↓
Backend: Verify JWT token
        ↓
Backend: Find and delete StoreTrust document
        ↓
Backend: Decrement Store.trustCount
        ↓
Backend: Return updated trust status
        ↓
Frontend: Update UI (button state, count)
        ↓
User sees updated trust status ✅
```

#### View Trusted Stores Flow
```
User clicks "My Trusted Stores" button
        ↓
Frontend: GET /api/stores/trusted
        ↓
Backend: Verify JWT token
        ↓
Backend: Query StoreTrust for user's trusts
        ↓
Backend: Populate store details
        ↓
Backend: Return list of trusted stores
        ↓
Frontend: Display trusted stores list
        ↓
User sees their trusted stores ✅
```

## Components and Interfaces

### Database Models

#### StoreTrust Model (New)
```javascript
{
  user: ObjectId (ref: 'User', required, indexed),
  store: ObjectId (ref: 'Store', required, indexed),
  createdAt: Date (auto-generated)
}

// Compound index for uniqueness and query performance
Index: { user: 1, store: 1 } (unique)
Index: { store: 1 } (for counting trusters)
Index: { user: 1 } (for fetching user's trusted stores)
```

#### Store Model Updates (Existing)
```javascript
{
  // ... existing fields ...
  trustCount: Number (default: 0, min: 0) // NEW FIELD
}
```

### API Endpoints

#### POST /api/stores/:storeId/trust
**Description:** Create a trust relationship between the authenticated user and a store

**Authentication:** Required (JWT)

**Request:**
```javascript
// URL Parameter
storeId: String (MongoDB ObjectId)

// Headers
Authorization: Bearer <jwt_token>
```

**Response (Success - 201):**
```javascript
{
  success: true,
  message: "Store trusted successfully",
  data: {
    isTrusted: true,
    trustCount: 42
  }
}
```

**Response (Already Trusted - 400):**
```javascript
{
  success: false,
  message: "You have already trusted this store"
}
```

**Response (Store Not Found - 404):**
```javascript
{
  success: false,
  message: "Store not found"
}
```

#### DELETE /api/stores/:storeId/trust
**Description:** Remove trust relationship between the authenticated user and a store

**Authentication:** Required (JWT)

**Request:**
```javascript
// URL Parameter
storeId: String (MongoDB ObjectId)

// Headers
Authorization: Bearer <jwt_token>
```

**Response (Success - 200):**
```javascript
{
  success: true,
  message: "Store untrusted successfully",
  data: {
    isTrusted: false,
    trustCount: 41
  }
}
```

**Response (Not Trusted - 400):**
```javascript
{
  success: false,
  message: "You have not trusted this store"
}
```

#### GET /api/stores/:storeId/trust-status
**Description:** Get trust status for a specific store for the authenticated user

**Authentication:** Required (JWT)

**Request:**
```javascript
// URL Parameter
storeId: String (MongoDB ObjectId)

// Headers
Authorization: Bearer <jwt_token>
```

**Response (Success - 200):**
```javascript
{
  success: true,
  data: {
    isTrusted: true,
    trustCount: 42
  }
}
```

#### GET /api/stores/trusted
**Description:** Get all stores trusted by the authenticated user

**Authentication:** Required (JWT)

**Request:**
```javascript
// Headers
Authorization: Bearer <jwt_token>
```

**Response (Success - 200):**
```javascript
{
  success: true,
  data: {
    trustedStores: [
      {
        _id: "store_id_1",
        storeName: "Tech Haven",
        storeSlug: "tech-haven",
        description: "Your one-stop shop for tech",
        logo: "https://cloudinary.com/...",
        trustCount: 42,
        trustedAt: "2024-01-15T10:30:00Z"
      },
      // ... more stores
    ],
    count: 5
  }
}
```

**Response (Empty - 200):**
```javascript
{
  success: true,
  data: {
    trustedStores: [],
    count: 0
  }
}
```

### Frontend Components

#### TrustButton Component
```javascript
// Props
{
  storeId: String,
  storeName: String,
  initialTrustCount: Number,
  initialIsTrusted: Boolean
}

// State
{
  isTrusted: Boolean,
  trustCount: Number,
  isLoading: Boolean
}

// Methods
- handleTrustToggle(): Toggles trust status
- fetchTrustStatus(): Gets current trust status
```

#### TrustedStoresList Component
```javascript
// State
{
  trustedStores: Array,
  isLoading: Boolean,
  error: String
}

// Methods
- fetchTrustedStores(): Loads user's trusted stores
- handleStoreClick(storeId): Navigates to store page
```

## Data Models

### StoreTrust Schema
```javascript
const storeTrustSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
    index: true
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Compound unique index to prevent duplicate trusts
storeTrustSchema.index({ user: 1, store: 1 }, { unique: true });

// Index for efficient trust count queries
storeTrustSchema.index({ store: 1 });

// Index for fetching user's trusted stores
storeTrustSchema.index({ user: 1 });
```

### Store Schema Update
```javascript
// Add to existing Store schema
trustCount: {
  type: Number,
  default: 0,
  min: [0, 'Trust count cannot be negative']
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing all acceptance criteria, several redundancies were identified:

**Redundant Properties:**
- Property 1.5 (trust count updates immediately) is subsumed by Properties 4.2 and 4.3 which explicitly test count increment/decrement
- Property 3.2 (untrusted indicator) is the logical inverse of 3.1 and can be tested together
- Property 5.3 (page refresh maintains state) is redundant with 5.1 and 5.2 which test persistence directly

**Combined Properties:**
- Properties 3.1 and 3.2 can be combined into a single property about trust status display
- Properties 4.2 and 4.3 can be tested together as a trust count consistency property

**Unique Properties Retained:**
- Trust relationship creation and removal (1.3, 1.4)
- Trust count accuracy (4.1)
- Trust count invariant (4.4)
- Trusted stores list accuracy (2.2)
- Concurrent trust handling (5.4)

### Correctness Properties

Property 1: Trust relationship creation
*For any* user and untrusted store, when the user trusts the store, a trust relationship should exist in the database linking that user to that store.
**Validates: Requirements 1.3, 5.1**

Property 2: Trust relationship removal
*For any* user and trusted store, when the user untrusts the store, the trust relationship should no longer exist in the database.
**Validates: Requirements 1.4, 5.2**

Property 3: Trust count increment on trust
*For any* store with an initial trust count N, when a new user trusts the store, the trust count should become N+1.
**Validates: Requirements 4.2**

Property 4: Trust count decrement on untrust
*For any* store with an initial trust count N (where N > 0), when a user untrusts the store, the trust count should become N-1.
**Validates: Requirements 4.3**

Property 5: Trust count accuracy
*For any* store, the displayed trust count should equal the actual number of StoreTrust documents in the database referencing that store.
**Validates: Requirements 1.2, 4.1**

Property 6: Trust count non-negativity
*For any* sequence of trust and untrust operations on a store, the trust count should never be less than zero.
**Validates: Requirements 4.4**

Property 7: Trusted stores list completeness
*For any* user, the list of trusted stores returned by the API should contain exactly the stores for which a StoreTrust relationship exists in the database for that user.
**Validates: Requirements 2.2**

Property 8: Trusted stores list data integrity
*For any* store in a user's trusted stores list, the store data should include storeName and trustCount fields with non-null values.
**Validates: Requirements 2.3**

Property 9: Trust status display consistency
*For any* user and store, the trust button's visual state (trusted/untrusted) should match whether a StoreTrust relationship exists in the database.
**Validates: Requirements 3.1, 3.3**

Property 10: UI state synchronization
*For any* trust or untrust action, after the operation completes, all UI elements displaying trust status (button state, count, list membership) should reflect the new database state.
**Validates: Requirements 3.4**

Property 11: Concurrent trust operations
*For any* store, when N users simultaneously trust the store (starting from count 0), the final trust count should be exactly N and N distinct StoreTrust relationships should exist.
**Validates: Requirements 5.4**

Property 12: Idempotent trust operations
*For any* user and store, attempting to trust an already-trusted store should not create duplicate relationships or incorrectly increment the count.
**Validates: Requirements 1.3 (error case)**

Property 13: Idempotent untrust operations
*For any* user and store, attempting to untrust an already-untrusted store should not affect the database or incorrectly decrement the count.
**Validates: Requirements 1.4 (error case)**

## Error Handling

### Error Scenarios

#### 1. Store Not Found
**Trigger:** User attempts to trust/untrust a non-existent store
**Response:** 404 status with message "Store not found"
**Behavior:** No database changes, UI shows error toast

#### 2. Already Trusted
**Trigger:** User attempts to trust a store they've already trusted
**Response:** 400 status with message "You have already trusted this store"
**Behavior:** No database changes, UI shows info message

#### 3. Not Trusted
**Trigger:** User attempts to untrust a store they haven't trusted
**Response:** 400 status with message "You have not trusted this store"
**Behavior:** No database changes, UI shows info message

#### 4. Unauthenticated Request
**Trigger:** Request made without valid JWT token
**Response:** 401 status with message "Authentication required"
**Behavior:** No database changes, redirect to login

#### 5. Database Connection Error
**Trigger:** MongoDB connection fails during operation
**Response:** 500 status with message "Database error occurred"
**Behavior:** Transaction rollback if applicable, UI shows error toast

#### 6. Concurrent Modification
**Trigger:** Multiple simultaneous trust/untrust operations on same relationship
**Response:** Use MongoDB atomic operations to prevent race conditions
**Behavior:** All operations complete successfully with correct final state

### Error Handling Strategy

```javascript
// Controller error handling pattern
try {
  // Validate input
  if (!mongoose.Types.ObjectId.isValid(storeId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid store ID"
    });
  }

  // Check store exists
  const store = await Store.findById(storeId);
  if (!store) {
    return res.status(404).json({
      success: false,
      message: "Store not found"
    });
  }

  // Perform operation with atomic updates
  // ...

} catch (error) {
  console.error('Trust operation error:', error);
  
  // Handle specific error types
  if (error.code === 11000) {
    // Duplicate key error
    return res.status(400).json({
      success: false,
      message: "You have already trusted this store"
    });
  }
  
  // Generic error
  return res.status(500).json({
    success: false,
    message: "An error occurred while processing your request"
  });
}
```

### Frontend Error Handling

```javascript
// React/React Native error handling
try {
  const response = await axios.post(`/api/stores/${storeId}/trust`);
  // Update UI on success
  setIsTrusted(true);
  setTrustCount(response.data.data.trustCount);
  showToast('success', 'Store trusted successfully');
} catch (error) {
  // Handle different error types
  if (error.response?.status === 400) {
    showToast('info', error.response.data.message);
  } else if (error.response?.status === 404) {
    showToast('error', 'Store not found');
  } else if (error.response?.status === 401) {
    // Redirect to login
    navigate('/login');
  } else {
    showToast('error', 'Failed to trust store. Please try again.');
  }
  
  // Revert optimistic UI updates if any
  setIsTrusted(previousState);
}
```

## Testing Strategy

### Unit Testing

The Store Trust System will use unit tests to verify specific behaviors and edge cases:

**Controller Tests:**
- Test trust store with valid user and store IDs
- Test untrust store with valid user and store IDs
- Test trust store that doesn't exist (404 error)
- Test trust store without authentication (401 error)
- Test trust already-trusted store (400 error)
- Test untrust already-untrusted store (400 error)
- Test get trusted stores for user with no trusts (empty array)
- Test get trust status for trusted and untrusted stores

**Model Tests:**
- Test StoreTrust model creation with valid data
- Test StoreTrust unique constraint (user + store combination)
- Test Store trustCount field default value and minimum constraint
- Test cascade behavior when store or user is deleted

**Integration Tests:**
- Test complete trust flow: trust → verify count → verify relationship
- Test complete untrust flow: untrust → verify count → verify relationship removed
- Test trust count consistency across multiple operations
- Test trusted stores list returns correct data with populated fields

### Property-Based Testing

The Store Trust System will use property-based testing to verify universal correctness properties across many randomly generated inputs. We will use **fast-check** for JavaScript/Node.js property-based testing.

**Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with format: `**Feature: store-trust-system, Property {number}: {property_text}**`

**Property Tests:**

1. **Trust Relationship Creation Property**
   - Generate random user IDs and store IDs
   - Trust the store
   - Verify relationship exists in database
   - Tag: `**Feature: store-trust-system, Property 1: Trust relationship creation**`

2. **Trust Relationship Removal Property**
   - Generate random user IDs and store IDs
   - Create trust relationship
   - Untrust the store
   - Verify relationship no longer exists
   - Tag: `**Feature: store-trust-system, Property 2: Trust relationship removal**`

3. **Trust Count Increment Property**
   - Generate random store with initial count
   - Generate random user
   - Trust the store
   - Verify count increased by exactly 1
   - Tag: `**Feature: store-trust-system, Property 3: Trust count increment on trust**`

4. **Trust Count Decrement Property**
   - Generate random store with trust relationships
   - Select random existing truster
   - Untrust the store
   - Verify count decreased by exactly 1
   - Tag: `**Feature: store-trust-system, Property 4: Trust count decrement on untrust**`

5. **Trust Count Accuracy Property**
   - Generate random store with random number of trusters
   - Query trust count from store document
   - Count StoreTrust documents for that store
   - Verify they match
   - Tag: `**Feature: store-trust-system, Property 5: Trust count accuracy**`

6. **Trust Count Non-Negativity Property**
   - Generate random sequence of trust/untrust operations
   - Execute operations in sequence
   - Verify count never goes below 0 at any point
   - Tag: `**Feature: store-trust-system, Property 6: Trust count non-negativity**`

7. **Trusted Stores List Completeness Property**
   - Generate random user with random trust relationships
   - Fetch trusted stores via API
   - Query StoreTrust documents for user
   - Verify returned list matches database exactly
   - Tag: `**Feature: store-trust-system, Property 7: Trusted stores list completeness**`

8. **Trusted Stores List Data Integrity Property**
   - Generate random user with trusted stores
   - Fetch trusted stores via API
   - Verify each store has storeName and trustCount fields
   - Tag: `**Feature: store-trust-system, Property 8: Trusted stores list data integrity**`

9. **Trust Status Display Consistency Property**
   - Generate random user and store combinations
   - For each combination, check if relationship exists
   - Fetch trust status via API
   - Verify API response matches database state
   - Tag: `**Feature: store-trust-system, Property 9: Trust status display consistency**`

10. **Concurrent Trust Operations Property**
    - Generate random store and N random users
    - Execute N simultaneous trust operations
    - Verify final count equals N
    - Verify N distinct relationships exist
    - Tag: `**Feature: store-trust-system, Property 11: Concurrent trust operations**`

11. **Idempotent Trust Property**
    - Generate random user and store
    - Trust the store twice
    - Verify only one relationship exists
    - Verify count incremented only once
    - Tag: `**Feature: store-trust-system, Property 12: Idempotent trust operations**`

12. **Idempotent Untrust Property**
    - Generate random user and store (not trusted)
    - Attempt to untrust twice
    - Verify no relationship created
    - Verify count unchanged
    - Tag: `**Feature: store-trust-system, Property 13: Idempotent untrust operations**`

### Test Data Generators

Property-based tests will use custom generators:

```javascript
// Generate random valid MongoDB ObjectId
const objectIdArbitrary = fc.hexaString({ minLength: 24, maxLength: 24 });

// Generate random user with trust relationships
const userWithTrustsArbitrary = fc.record({
  userId: objectIdArbitrary,
  trustedStoreIds: fc.array(objectIdArbitrary, { minLength: 0, maxLength: 20 })
});

// Generate random store with trust count
const storeWithCountArbitrary = fc.record({
  storeId: objectIdArbitrary,
  trustCount: fc.nat({ max: 10000 })
});

// Generate random trust/untrust operation sequence
const operationSequenceArbitrary = fc.array(
  fc.record({
    type: fc.constantFrom('trust', 'untrust'),
    userId: objectIdArbitrary,
    storeId: objectIdArbitrary
  }),
  { minLength: 1, maxLength: 50 }
);
```

### Testing Tools

- **Unit Testing:** Jest or Mocha with Chai
- **Property-Based Testing:** fast-check
- **API Testing:** Supertest
- **Database Testing:** MongoDB Memory Server (for isolated tests)
- **Mocking:** Sinon.js (minimal use, prefer real implementations)

### Test Coverage Goals

- Unit test coverage: 80%+ for controllers and models
- Property tests: All 13 correctness properties implemented
- Integration tests: All API endpoints covered
- Edge cases: Empty states, error conditions, boundary values

## Performance Considerations

### Database Optimization

**Indexes:**
```javascript
// StoreTrust collection
{ user: 1, store: 1 } // Unique compound index (prevents duplicates, fast lookups)
{ store: 1 }          // Fast trust count queries
{ user: 1 }           // Fast user's trusted stores queries

// Store collection
{ _id: 1 }            // Default primary key index
{ trustCount: -1 }    // Optional: for sorting stores by popularity
```

**Query Optimization:**
- Use `lean()` for read-only queries to improve performance
- Use `select()` to limit returned fields
- Use aggregation pipeline for complex trust count calculations
- Implement pagination for trusted stores list (limit 20 per page)

### Caching Strategy

**Client-Side Caching:**
- Cache trust status in component state after fetching
- Cache trusted stores list for 5 minutes
- Invalidate cache on trust/untrust actions

**Server-Side Caching (Optional):**
- Cache popular stores' trust counts in Redis (TTL: 60 seconds)
- Invalidate on trust/untrust operations
- Reduces database load for frequently viewed stores

### Atomic Operations

Use MongoDB atomic operations to prevent race conditions:

```javascript
// Trust operation (atomic increment)
await Store.findByIdAndUpdate(
  storeId,
  { $inc: { trustCount: 1 } },
  { new: true }
);

// Untrust operation (atomic decrement with minimum)
await Store.findByIdAndUpdate(
  storeId,
  { $inc: { trustCount: -1 }, $max: { trustCount: 0 } },
  { new: true }
);
```

### Scalability Considerations

- Trust operations are lightweight (single document insert/delete)
- Trust count updates use atomic operations (no race conditions)
- Indexes ensure O(log n) query performance
- Pagination prevents large data transfers
- System can handle thousands of concurrent trust operations

## Security Considerations

### Authentication & Authorization

- All trust endpoints require JWT authentication
- Users can only trust/untrust stores (no admin privileges needed)
- Users can only view their own trusted stores list
- Store owners cannot manipulate their own trust count

### Input Validation

```javascript
// Validate store ID format
if (!mongoose.Types.ObjectId.isValid(storeId)) {
  return res.status(400).json({ message: "Invalid store ID" });
}

// Validate store exists
const store = await Store.findById(storeId);
if (!store) {
  return res.status(404).json({ message: "Store not found" });
}
```

### Rate Limiting

Implement rate limiting to prevent abuse:
- Trust/untrust operations: 10 requests per minute per user
- Get trusted stores: 30 requests per minute per user
- Get trust status: 60 requests per minute per user

### Data Integrity

- Unique compound index prevents duplicate trust relationships
- Atomic operations prevent race conditions
- Minimum constraint on trustCount prevents negative values
- Cascade delete: Remove StoreTrust documents when user or store is deleted

## Deployment Considerations

### Database Migration

```javascript
// Migration script to add trustCount field to existing stores
db.stores.updateMany(
  { trustCount: { $exists: false } },
  { $set: { trustCount: 0 } }
);

// Recalculate trust counts from StoreTrust collection
db.stores.find().forEach(store => {
  const count = db.storetrusts.countDocuments({ store: store._id });
  db.stores.updateOne(
    { _id: store._id },
    { $set: { trustCount: count } }
  );
});
```

### Rollback Plan

If issues arise:
1. Disable trust endpoints via feature flag
2. Keep StoreTrust collection intact (no data loss)
3. Remove trustCount field from Store model (optional)
4. Re-enable after fixes

### Monitoring

Track these metrics:
- Trust/untrust operation success rate
- Average response time for trust operations
- Trust count accuracy (periodic validation)
- Error rate by error type
- Most trusted stores (analytics)

---

**Design Version:** 1.0  
**Last Updated:** 2024  
**Status:** ✅ Ready for Implementation
