# 🏗️ ShopVerse Architecture

## System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
│                   http://localhost:5173                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    React Application                       │ │
│  │                                                            │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │              Components                              │ │ │
│  │  │  - Products.jsx                                      │ │ │
│  │  │  - LoginSignupForm.jsx                               │ │ │
│  │  │  - Navbar.jsx                                        │ │ │
│  │  │  - ProductCard.jsx                                   │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                          ↓                                  │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │              Context Providers                       │ │ │
│  │  │  - AuthContext (Login/User)                          │ │ │
│  │  │  - GlobalContext (Cart/Wishlist)                     │ │ │
│  │  └─────────────────────────────���────────────────────────┘ │ │
│  │                          ↓                                  │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │              Axios HTTP Client                       │ │ │
│  │  │  - Sends requests to backend                         │ │ │
│  │  │  - Includes JWT token in headers                     │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                              ↓ HTTP
                    (API Requests/Responses)
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                      BACKEND SERVER                              │
│                   http://localhost:5000                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  Express.js Server                         │ │
│  │                                                            │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │              API Routes                              │ │ │
│  │  │  - /api/auth (Login/Signup)                          │ │ │
│  │  │  - /api/products (Get products/filters)              │ │ │
│  │  │  - /api/cart (Cart operations)                       │ │ │
│  │  │  - /api/user (User data)                             │ │ │
│  │  │  - /api/spin (Spin feature)                          │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                          ↓                                  │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │              Controllers                             │ │ │
│  │  │  - authController                                    │ │ │
│  │  │  - productController                                 │ │ │
│  │  │  - cartController                                    │ │ │
│  │  │  - userController                                    │ │ │
│  │  │  - spinController                                    │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                          ↓                                  │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │              Middleware                              │ │ │
│  │  │  - JWT Authentication                                │ │ │
│  │  │  - CORS                                              │ │ │
│  │  │  - Error Handling                                    │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                          ↓                                  │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │              Models (Mongoose)                       │ │ │
│  │  │  - User                                              │ │ │
│  │  │  - Product                                           │ │ │
│  │  │  - Cart                                              │ │ │
│  │  │  - Order                                             │ │ │
│  │  │  - Spin                                              │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────────���─────────────────────────────────────────────────┘
                              ↓ Database Queries
                    (MongoDB Protocol)
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                      MONGODB ATLAS                               │
│                    (Cloud Database)                              │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Collections                                  │ │
│  │  - users                                                  │ │
│  │  - products                                               │ │
│  │  - carts                                                  │ │
│  │  - orders                                                 │ │
│  │  - spins                                                  │ │
│  │  - wishlists                                              │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

### User Login Flow

```
User enters credentials
        ↓
Frontend: POST /api/auth/login
        ↓
Backend: Verify credentials
        ↓
Backend: Generate JWT token
        ↓
Frontend: Store token in localStorage
        ↓
Frontend: Store user data in context
        ↓
Frontend: Redirect to home page
        ↓
User logged in ✅
```

### Product Fetching Flow

```
User visits home page
        ↓
Frontend: GET /api/products/get-products
        ↓
Backend: Query MongoDB for products
        ↓
Backend: Apply filters (category, brand, price)
        ↓
Backend: Return filtered products
        ↓
Frontend: Display products in grid
        ↓
Products visible ✅
```

### Add to Cart Flow

```
User clicks "Add to Cart"
        ↓
Frontend: POST /api/cart/add/{productId}
        ↓
Backend: Verify JWT token
        ↓
Backend: Find user's cart
        ↓
Backend: Add product to cart
        ↓
Backend: Calculate total price
        ↓
Backend: Return updated cart
        ↓
Frontend: Update cart state
        ↓
Frontend: Show success toast
        ↓
Product added ✅
```

---

## Component Hierarchy

```
App.jsx
├── AuthProvider
│   └── GlobalProvider
│       ├── AppRoutes
│       │   ├── LoginSignUpPage
│       │   │   └── LoginSignupForm
│       │   ├── MainLayoutPage
│       │   │   ├── Navbar
│       │   │   │   ├── Cart (Dropdown)
│       │   │   │   └── Wishlist (Icon)
│       │   │   └── Products
│       │   │       ├── Filter Sidebar
│       │   │       └── ProductCard (Grid)
│       │   └── ProductDetailPage
│       └── Other Routes
```

---

## State Management

### AuthContext
```javascript
{
  currentUser: {
    _id: "...",
    username: "...",
    email: "...",
    role: "user"
  },
  fetchAndUpdateCurrentUser: () => {},
  signup: () => {},
  login: () => {},
  logout: () => {}
}
```

### GlobalContext
```javascript
{
  // Cart
  cartItems: {
    totalCartPrice: 0,
    cart: [
      {
        _id: "...",
        product: { _id, name, price, image },
        quantity: 1
      }
    ]
  },
  fetchCart: () => {},
  handleAddToCart: () => {},
  handleQtyInc: () => {},
  handleQtyDec: () => {},
  handleRemoveCartItem: () => {},
  
  // Wishlist
  wishlistItems: [],
  fetchWishlist: () => {},
  handleAddToWishlist: () => {},
  handleDeleteFromWishlist: () => {},
  
  // UI
  isOpen: false,
  toggleCart: () => {},
  isCartLoading: false
}
```

---

## API Endpoints

### Authentication
```
POST   /api/auth/login              - Login user
POST   /api/auth/registerr          - Register user
GET    /api/user/single             - Get current user
```

### Products
```
GET    /api/products/get-products   - Get products with filters
GET    /api/products/get-filters    - Get available filters
GET    /api/products/get-wishlist   - Get user's wishlist
GET    /api/products/add-to-wishlist/:id    - Add to wishlist
DELETE /api/products/delete-from-wishlist/:id - Remove from wishlist
```

### Cart
```
GET    /api/cart/get                - Get user's cart
POST   /api/cart/add/:id            - Add product to cart
PATCH  /api/cart/qty-inc/:id        - Increase quantity
PATCH  /api/cart/qty-dec/:id        - Decrease quantity
DELETE /api/cart/remove/:id         - Remove from cart
```

### Spin Feature
```
GET    /api/spin/get-active         - Get active spin result
POST   /api/spin/spin               - Perform spin
```

---

## Database Schema

### User
```javascript
{
  _id: ObjectId,
  username: String,
  email: String,
  password: String (hashed),
  role: String (user/admin),
  createdAt: Date
}
```

### Product
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  price: Number,
  category: String,
  brand: String,
  image: String (URL),
  stock: Number,
  rating: Number,
  createdAt: Date
}
```

### Cart
```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: User),
  cartItems: [
    {
      product: ObjectId (ref: Product),
      quantity: Number
    }
  ],
  totalCartPrice: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Spin
```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: User),
  discountType: String (percentage/fixed/free),
  discount: Number,
  label: String,
  expiresAt: Date,
  hasCheckedOut: Boolean,
  createdAt: Date
}
```

---

## Authentication Flow

```
┌─────────────────────────────────────────────────────┐
│                   Frontend                          │
│                                                     │
│  1. User enters credentials                         │
│  2. POST /api/auth/login                            │
│  3. Receive JWT token                               │
│  4. Store in localStorage                           │
│  5. Store user in context                           │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│                   Backend                           │
│                                                     │
│  1. Receive credentials                             │
│  2. Hash password & compare                         │
│  3. Generate JWT token                              │
│  4. Return token + user data                        │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│              Subsequent Requests                    │
│                                                     │
│  Header: Authorization: Bearer {token}              │
│  Backend: Verify token                              │
│  Backend: Extract user ID from token                │
│  Backend: Proceed with request                      │
└─────────────────────────────────────────────────────┘
```

---

## Error Handling Flow

```
Frontend makes request
        ↓
Backend processes request
        ↓
Error occurs?
        ├─ YES → Return error response
        │         ↓
        │    Frontend catches error
        │         ↓
        │    Check error.response?.data?.msg
        │         ↓
        │    Show toast notification
        │         ↓
        │    User sees error message ✅
        │
        └─ NO → Return success response
                 ↓
            Frontend processes data
                 ↓
            Update state
                 ↓
            Show success toast
                 ↓
            User sees result ✅
```

---

## Performance Considerations

### Frontend Optimization
- Components use React.memo for memoization
- Context prevents unnecessary re-renders
- Lazy loading for images
- Debounced search input

### Backend Optimization
- MongoDB indexes on frequently queried fields
- JWT token caching
- Response compression
- Database connection pooling

### Caching Strategy
- User data cached in localStorage
- Cart cached in context
- Wishlist cached in context
- Spin result cached in localStorage (24 hours)

---

## Security Measures

### Frontend
- JWT token stored in localStorage
- Token sent in Authorization header
- CORS enabled for trusted origins
- Input validation on forms

### Backend
- Password hashing with bcrypt
- JWT token verification
- CORS middleware
- Input sanitization
- Rate limiting (recommended)

---

## Deployment Architecture

```
┌──────────────────────────────────────────────────────┐
│                  Production                          │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │  Frontend (Vercel/Netlify)                     │ │
│  │  - Static files                                │ │
│  │  - CDN distribution                            │ │
│  └───��────────────────────────────────────────────┘ │
│                      ↓                               │
│  ┌────────────────────────────────────────────────┐ │
│  │  Backend (Heroku/Railway/Render)               │ │
│  │  - Node.js server                              │ │
│  │  - Environment variables                       │ │
│  └────────────────────────────────────────────────┘ │
│                      ↓                               │
│  ┌────────────────────────────────────────────────┐ │
│  │  MongoDB Atlas                                 │ │
│  │  - Cloud database                              │ │
│  │  - Automatic backups                           │ │
│  └────────────────────────────────────────────────┘ │
└───────────────────────��──────────────────────────────┘
```

---

**Architecture Version:** 1.0  
**Last Updated:** 2024  
**Status:** ✅ Complete
