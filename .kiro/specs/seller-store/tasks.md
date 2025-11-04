# Implementation Plan - Seller Store Feature

- [x] 1. Create Store database model and setup
  - Create Store model with schema (seller, storeName, storeSlug, description, logo, banner, isActive, views)
  - Add indexes for storeSlug, seller, and text search on storeName/description
  - Add virtual field to User model for store relationship
  - _Requirements: 1.1, 1.2, 7.1_

- [x] 2. Implement store backend API endpoints
- [x] 2.1 Create store CRUD operations
  - Implement POST /api/stores/create endpoint with seller authentication
  - Implement GET /api/stores/my-store endpoint for sellers
  - Implement PUT /api/stores/update endpoint with ownership validation
  - Implement DELETE /api/stores/delete endpoint
  - Add slug generation logic (convert store name to URL-safe slug)
  - _Requirements: 1.2, 1.3, 5.2, 5.5_

- [x] 2.2 Create store search and discovery endpoints
  - Implement GET /api/stores/search endpoint with text search
  - Implement GET /api/stores/suggestions endpoint for autocomplete (limit 5 results)
  - Implement GET /api/stores/:slug endpoint for public store access
  - Implement GET /api/stores/:slug/products endpoint to get store products
  - Implement GET /api/stores/all endpoint with pagination
  - _Requirements: 2.2, 2.3, 3.1, 6.1_

- [x] 2.3 Add store analytics endpoint
  - Implement POST /api/stores/:slug/view to increment view count
  - Implement GET /api/stores/analytics for seller stats
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 3. Create store routes and middleware
  - Create storeRoutes.js with all store endpoints
  - Add isSellerAuth middleware for seller-only operations
  - Add isStoreOwner middleware for store ownership validation
  - Add input validation middleware for store data
  - Register store routes in server.js
  - _Requirements: 1.1, 5.1_

- [x] 4. Build StoreSettings component for seller dashboard
  - Create StoreSettings.jsx component with form (name, description, logo, banner)
  - Add form validation (name 3-50 chars, description max 500 chars)
  - Implement image upload for logo and banner (max 5MB, image types only)
  - Add image preview functionality
  - Add store URL slug preview
  - Implement save/update store functionality
  - Add delete store option with confirmation
  - Add "Preview Store" button linking to store page
  - Show success/error toasts for operations
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 5.2, 5.3, 5.4, 5.5_

- [x] 5. Add Store Settings to seller dashboard navigation
  - Add "Store Settings" menu item to SellerDashboard sidebar
  - Create route /seller-dashboard/store-settings
  - Add StoreSettings to seller dashboard routes
  - _Requirements: 5.1, 5.2_

- [x] 6. Create StoreSearch component for homepage
  - Create StoreSearch.jsx with search input and icon
  - Implement debounced search (300ms delay)
  - Add autocomplete dropdown showing store suggestions
  - Display store logo and name in suggestions
  - Add keyboard navigation (arrow keys, enter, escape)
  - Implement click outside to close dropdown
  - Add loading state during search
  - Show "No stores found" empty state
  - Add "View all stores" link at bottom of dropdown
  - Navigate to store page on suggestion click
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 7. Integrate StoreSearch into homepage
  - Add StoreSearch component to Products.jsx or MainLayoutPage.jsx
  - Position search prominently (near product search or in hero section)
  - Style to match existing design system
  - _Requirements: 2.1_

- [x] 8. Build StorePage component
  - Create StorePage.jsx component
  - Add route /store/:slug in AppRoutes
  - Fetch store data by slug on mount
  - Display store banner image (full width)
  - Display store logo (circular, overlapping banner)
  - Display store name and description
  - Show store stats (product count, views)
  - Fetch and display products from this seller only
  - Reuse existing ProductCard component for product grid
  - Add breadcrumb navigation (Home > Stores > Store Name)
  - Handle store not found (404) with helpful message
  - Add share store button (copy link)
  - _Requirements: 3.1, 3.2, 3.3, 3.5, 7.3, 7.4_

- [x] 9. Add filters to StorePage
  - Integrate existing filter sidebar (categories, price range, search)
  - Filter only products from current store
  - Maintain filter state in URL query params
  - _Requirements: 3.4_

- [x] 10. Create StoreInfo component for product details
  - Create StoreInfo.jsx component
  - Accept props: sellerId, storeName, storeLogo, storeSlug
  - Display store logo (clickable, links to store page)
  - Display store name (clickable, links to store page)
  - Add "Visit Store" button
  - Show fallback "Sold by [username]" if no store configured
  - Style as a card with hover effects
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 11. Integrate StoreInfo into ProductDetailPage
  - Add StoreInfo component to product detail page
  - Fetch seller's store data when loading product
  - Pass store data to StoreInfo component
  - Position below product images or in sidebar
  - _Requirements: 4.1_

- [x] 12. Update Product API to include store information
  - Modify product GET endpoints to populate seller's store data
  - Add store info to product response (storeName, storeSlug, storeLogo)
  - Update ProductCard to optionally show store badge
  - _Requirements: 4.1_

- [x] 13. Create StoresListing page
  - Create StoresListing.jsx component
  - Add route /stores in AppRoutes
  - Fetch all stores with pagination
  - Display stores in grid layout using StoreCard component
  - Add search input for filtering stores
  - Add sort dropdown (newest, most products, most views)
  - Implement pagination controls
  - Show empty state if no stores exist
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 14. Create StoreCard component
  - Create StoreCard.jsx for store preview
  - Display store logo, name, and product count
  - Add hover effects and animations
  - Make entire card clickable to navigate to store
  - Show store views count
  - _Requirements: 6.2_

- [x] 15. Add stores link to main navigation
  - Add "Stores" link to Navbar
  - Link to /stores page
  - Style consistently with other nav items
  - _Requirements: 6.1_

- [x] 16. Implement store URL slug generation
  - Create utility function to generate URL-safe slugs
  - Convert store name to lowercase, replace spaces with hyphens
  - Remove special characters
  - Handle duplicate slugs by appending number
  - Validate slug format on backend
  - _Requirements: 7.1, 7.2_

- [x] 17. Add SEO meta tags to StorePage
  - Set page title to "[Store Name] - genZ Winners"
  - Add meta description from store description
  - Add Open Graph tags for social sharing
  - Add canonical URL
  - _Requirements: 7.3, 7.4_

- [x] 18. Handle 404 for invalid store URLs
  - Create StoreNotFound component
  - Show "Store not found" message
  - Add suggestions (browse all stores, search stores)
  - Add link back to homepage
  - _Requirements: 7.5_

- [x] 19. Add store analytics display in StoreSettings
  - Fetch store analytics data
  - Display total views, product count, total sales
  - Show analytics in dashboard cards
  - Add refresh button for analytics
  - Handle zero/unavailable data gracefully
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 20. Add store view tracking
  - Increment view count when StorePage loads
  - Debounce to prevent multiple counts per session
  - Use localStorage to track viewed stores
  - _Requirements: 8.1_

- [x] 21. Add loading states and error handling
  - Add loading spinners for all async operations
  - Show error toasts for failed operations
  - Add retry buttons for failed requests
  - Handle network errors gracefully
  - Add form validation error messages
  - _Requirements: All_

- [x] 22. Style all store components
  - Apply consistent styling matching existing design system
  - Ensure responsive design for mobile/tablet/desktop
  - Add smooth animations and transitions
  - Use existing color scheme (blues, greens for sellers)
  - Add hover effects and interactive feedback
  - _Requirements: All_

- [x] 23. Test store feature end-to-end
  - Test seller creates store flow
  - Test user searches and finds store
  - Test store page displays correctly
  - Test product detail shows store info
  - Test store update and delete
  - Test edge cases (no store, invalid slug, etc.)
  - Test on different screen sizes
  - _Requirements: All_

- [x] 24. Update documentation
  - Add store feature to README
  - Document API endpoints
  - Add screenshots of store pages
  - Update deployment guide if needed
  - _Requirements: All_
