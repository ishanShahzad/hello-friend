# Design Document - Seller Store Feature

## Overview

The Seller Store feature transforms the platform into a multi-vendor marketplace by allowing sellers to create branded storefronts. This design document outlines the technical architecture, data models, API endpoints, and UI components needed to implement this feature.

## Architecture

### High-Level Architecture

```
┌─────────────────┐
│   Frontend      │
│  (React/Vite)   │
└────────┬────────┘
         │
         │ REST API
         │
┌────────▼────────┐
│   Backend       │
│  (Node/Express) │
└────────┬────────┘
         │
         │ Mongoose
         │
┌────────▼────────┐
│   MongoDB       │
│  (Database)     │
└─────────────────┘
```

### Component Architecture

**Frontend Components:**
- `StoreSearch` - Homepage store search with autocomplete
- `StorePage` - Individual store display page
- `StoreSettings` - Seller dashboard store configuration
- `StoreCard` - Store preview card for listings
- `StoreInfo` - Store information display on product details
- `StoresListing` - Browse all stores page

**Backend Components:**
- `Store Model` - MongoDB schema for store data
- `Store Controller` - Business logic for store operations
- `Store Routes` - API endpoints for store management
- `Store Middleware` - Validation and authorization

## Data Models

### Store Schema

```javascript
const storeSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true // One store per seller
  },
  storeName: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  storeSlug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    maxlength: 500,
    default: ''
  },
  logo: {
    type: String, // Cloudinary URL
    default: ''
  },
  banner: {
    type: String, // Cloudinary URL
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  views: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for search
storeSchema.index({ storeName: 'text', description: 'text' });
storeSchema.index({ storeSlug: 1 });
storeSchema.index({ seller: 1 });
```

### Updated Product Schema

```javascript
// Add to existing Product schema
{
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Populate store info when querying products
}
```

### Updated User Schema

```javascript
// Add virtual field to User schema
userSchema.virtual('store', {
  ref: 'Store',
  localField: '_id',
  foreignField: 'seller',
  justOne: true
});
```

## API Endpoints

### Store Management

```
POST   /api/stores/create          - Create a new store
GET    /api/stores/my-store        - Get seller's own store
PUT    /api/stores/update          - Update store information
DELETE /api/stores/delete          - Delete store
GET    /api/stores/:slug           - Get store by slug (public)
GET    /api/stores/seller/:id      - Get store by seller ID (public)
```

### Store Search & Discovery

```
GET    /api/stores/search?q=       - Search stores by name
GET    /api/stores/suggestions?q=  - Get store autocomplete suggestions
GET    /api/stores/all             - Get all stores (paginated)
GET    /api/stores/:slug/products  - Get products from a specific store
```

### Store Analytics

```
GET    /api/stores/analytics       - Get store analytics (seller only)
POST   /api/stores/:slug/view      - Increment store view count
```

## Components and Interfaces

### 1. StoreSearch Component (Homepage)

**Location:** `Frontend/src/components/common/StoreSearch.jsx`

**Props:** None

**Features:**
- Search input with icon
- Autocomplete dropdown
- Debounced search (300ms)
- Keyboard navigation (arrow keys, enter)
- Click outside to close
- Loading state
- Empty state

**UI Design:**
```
┌─────────────────────────────────────┐
│  🔍  Search for stores...           │
└─────────────────────────────────────┘
         ↓ (when typing)
┌─────────────────────────────────────┐
│  📦 Tech Store                      │
│  📦 Fashion Hub                     │
│  📦 Home Essentials                 │
│  View all stores →                  │
└─────────────────────────────────────┘
```

### 2. StorePage Component

**Location:** `Frontend/src/pages/StorePage.jsx`

**Route:** `/store/:slug`

**Features:**
- Store header with banner, logo, name, description
- Product grid (reuse existing ProductCard)
- Filters (categories, price range)
- Breadcrumb navigation
- Share store button
- Contact seller button (optional)

**Layout:**
```
┌──────────────────────────────────────────┐
│         [Banner Image]                   │
│  [Logo]  Store Name                      │
│          Store Description               │
│          📦 X Products | 👁 Y Views      │
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│  Filters  │  Product Grid                │
│           │  [Product] [Product]         │
│           │  [Product] [Product]         │
└──────────────────────────────────────────┘
```

### 3. StoreSettings Component (Seller Dashboard)

**Location:** `Frontend/src/components/layout/StoreSettings.jsx`

**Route:** `/seller-dashboard/store-settings`

**Features:**
- Form with store name, description
- Logo upload (with preview)
- Banner upload (with preview)
- Store URL preview
- Save/Cancel buttons
- Delete store option
- Store preview link

**Form Fields:**
```
Store Name *        [________________]
Store Description   [________________]
                    [________________]
Logo                [Upload] [Preview]
Banner              [Upload] [Preview]

Store URL: genzwinners.com/store/your-store-name

[Preview Store]  [Save Changes]  [Delete Store]
```

### 4. StoreInfo Component (Product Detail Page)

**Location:** `Frontend/src/components/common/StoreInfo.jsx`

**Props:** `{ sellerId, storeName, storeLogo, storeSlug }`

**Features:**
- Store logo (clickable)
- Store name (clickable)
- "Visit Store" button
- Fallback to "Sold by [username]"

**UI Design:**
```
┌─────────────────────────────────┐
│  [Logo] Tech Store              │
│         Visit Store →           │
└─────────────────────────────────┘
```

### 5. StoresListing Component

**Location:** `Frontend/src/pages/StoresListing.jsx`

**Route:** `/stores`

**Features:**
- Grid of store cards
- Search/filter stores
- Pagination
- Sort options (newest, most products, most views)

**Layout:**
```
┌──────────────────────────────────────┐
│  All Stores                          │
│  [Search] [Sort: Newest ▼]          │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│  [Store Card] [Store Card]           │
│  [Store Card] [Store Card]           │
│  [Pagination]                        │
└──────────────────────────────────────┘
```

## Error Handling

### Frontend Error Scenarios

1. **Store Not Found (404)**
   - Display: "Store not found" with link to browse all stores
   
2. **Store Creation Failed**
   - Display: Error message with specific reason (duplicate name, etc.)
   
3. **Image Upload Failed**
   - Display: "Failed to upload image. Please try again."
   - Allow retry

4. **Search API Failed**
   - Display: "Unable to search stores. Please try again."
   - Graceful degradation

### Backend Error Handling

```javascript
// Store creation errors
- 400: Invalid store data
- 409: Store already exists for this seller
- 413: Image file too large
- 500: Server error

// Store retrieval errors
- 404: Store not found
- 500: Server error
```

## Testing Strategy

### Unit Tests

**Backend:**
- Store model validation
- Store controller methods
- Slug generation logic
- Search functionality

**Frontend:**
- StoreSearch autocomplete logic
- Form validation
- Image upload handling

### Integration Tests

- Create store flow (end-to-end)
- Search and navigate to store
- Update store information
- Delete store
- View store products

### E2E Tests

1. **Seller creates store:**
   - Login as seller → Navigate to store settings → Fill form → Upload images → Save → Verify store page

2. **User discovers store:**
   - Go to homepage → Search for store → Click suggestion → View store page → Click product

3. **User views product with store info:**
   - Navigate to product → See store info → Click "Visit Store" → View store page

## Performance Considerations

### Optimization Strategies

1. **Database Indexing:**
   - Index on `storeSlug` for fast lookups
   - Text index on `storeName` and `description` for search
   - Index on `seller` for seller-specific queries

2. **Caching:**
   - Cache store data for 5 minutes (Redis/memory)
   - Cache store search results for 1 minute
   - Invalidate cache on store update

3. **Image Optimization:**
   - Compress images before upload
   - Use Cloudinary transformations for different sizes
   - Lazy load store banners

4. **Query Optimization:**
   - Populate store data only when needed
   - Use lean() for read-only queries
   - Limit search results to 10 stores

### Performance Targets

- Store search autocomplete: < 300ms
- Store page load: < 2s
- Store creation: < 5s (including image upload)
- Store listing page: < 1.5s

## Security Considerations

### Authentication & Authorization

```javascript
// Middleware for store operations
const isSellerAuth = (req, res, next) => {
  if (req.user.role !== 'seller') {
    return res.status(403).json({ msg: 'Seller access only' });
  }
  next();
};

const isStoreOwner = async (req, res, next) => {
  const store = await Store.findOne({ seller: req.user.id });
  if (!store) {
    return res.status(404).json({ msg: 'Store not found' });
  }
  req.store = store;
  next();
};
```

### Input Validation

- Sanitize store name and description (prevent XSS)
- Validate image file types and sizes
- Validate slug format (alphanumeric and hyphens only)
- Rate limit store creation (1 per seller)

### Data Protection

- Only store owner can update/delete their store
- Store data is public but seller info is protected
- Image URLs are validated before storage

## Migration Strategy

### Phase 1: Database Setup
1. Create Store model
2. Add indexes
3. Test with sample data

### Phase 2: Backend API
1. Implement store CRUD endpoints
2. Add search functionality
3. Test all endpoints

### Phase 3: Frontend Components
1. Build StoreSettings in seller dashboard
2. Add Storpport
ge suulti-langua
- Mct formStore conta links
- l mediatore sociaboard
- Sytics dash analrs
- Store tieiptionre subscr Stoes
-orire categ
- Stoewsgs and reviatintore rtion
- Stomizahemes/cus
- Store tts
Enhancemen
## Future 
or issues Monitor f changes
3.ndeploy fronte. Des
2ackend changDeploy bloyment
1. 5: Depase 
### Phug fixes
ng
3. Bnce testiorma2. Perfnd testing
-end-to1. ETesting
ration & eg4: Inthase ### Pdetails

t roducoreInfo to p. Add St
4ePageeate Storepage
3. Cr homeSearch to