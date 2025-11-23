# Mobile App Testing Checklist

## ✅ Setup Complete
- [x] 24 screens created (10 customer + 3 auth + 11 admin/seller)
- [x] All dependencies installed including @react-native-picker/picker
- [x] API configuration with axios interceptors
- [x] Navigation with role-based access
- [x] All backend API endpoints mapped correctly

## 📱 Customer Features Testing

### Authentication
- [ ] Login with existing account
- [ ] Sign up new account
- [ ] Logout functionality
- [ ] Token persistence (stays logged in after app restart)

### Product Browsing
- [ ] Home screen loads products
- [ ] Search products works
- [ ] Product detail screen shows all info
- [ ] Product images display correctly

### Shopping Cart
- [ ] Add product to cart
- [ ] Cart badge shows correct count
- [ ] Update quantity in cart
- [ ] Remove items from cart
- [ ] Cart persists across sessions

### Wishlist
- [ ] Add product to wishlist
- [ ] Heart icon toggles correctly
- [ ] Remove from wishlist
- [ ] Navigate to product from wishlist

### Checkout & Orders
- [ ] Checkout form validation
- [ ] Place order successfully
- [ ] View order history
- [ ] View order details
- [ ] Order status displays correctly

### Profile
- [ ] View profile information
- [ ] Currency selector works
- [ ] Role-based menu items appear (admin/seller)

## 👨‍💼 Admin Features Testing

### Admin Dashboard
- [ ] Dashboard loads without errors
- [ ] All 5 menu items navigate correctly
- [ ] Icons and colors display properly

### Store Overview
- [ ] Total revenue displays
- [ ] Total orders count
- [ ] Statistics cards show data
- [ ] Loading state works

### Product Management
- [ ] View all products list
- [ ] Add new product
- [ ] Edit existing product
- [ ] Delete product with confirmation
- [ ] FAB button works

### Order Management
- [ ] View all orders
- [ ] Filter by status
- [ ] Navigate to order details
- [ ] Status badges show correct colors

### Order Detail Management
- [ ] View complete order info
- [ ] Customer information displays
- [ ] Order items list shows
- [ ] Update order status
- [ ] Status picker works

### User Management
- [ ] View all users
- [ ] Role badges display correctly
- [ ] User list scrolls smoothly

### Tax Configuration
- [ ] Load current tax rate
- [ ] Update tax rate
- [ ] Load shipping fee
- [ ] Update shipping fee
- [ ] Save button works

## 🏪 Seller Features Testing

### Seller Dashboard
- [ ] Dashboard loads without errors
- [ ] All 5 menu items navigate correctly
- [ ] Icons and colors display properly

### Store Overview
- [ ] Seller-specific stats display
- [ ] Revenue tracking works
- [ ] Order count accurate

### Product Management (Seller)
- [ ] View only seller's products
- [ ] Add new product
- [ ] Edit own product
- [ ] Delete own product
- [ ] Cannot see other sellers' products

### Order Management (Seller)
- [ ] View only seller's orders
- [ ] Update order status
- [ ] View order details

### Store Settings
- [ ] Load store name
- [ ] Update store name
- [ ] Load store description
- [ ] Update store description
- [ ] Save button works

### Shipping Configuration
- [ ] Load shipping fee
- [ ] Update shipping fee
- [ ] Load free shipping threshold
- [ ] Update threshold
- [ ] Save configuration

## 🔧 Technical Testing

### API Integration
- [ ] All endpoints return data
- [ ] Error handling works (network errors)
- [ ] Loading states display
- [ ] Toast notifications appear
- [ ] Auth token included in requests

### Navigation
- [ ] Back button works on all screens
- [ ] Deep linking works (if implemented)
- [ ] Tab navigation smooth
- [ ] Stack navigation correct
- [ ] No navigation loops

### Performance
- [ ] App loads quickly
- [ ] No memory leaks
- [ ] Smooth scrolling
- [ ] Images load efficiently
- [ ] No crashes

### UI/UX
- [ ] All text readable
- [ ] Colors consistent with theme
- [ ] Spacing looks good
- [ ] Touch targets adequate size
- [ ] Forms validate input

## 🐛 Known Issues to Watch For

1. **Network Errors**: If backend is not running, app should show friendly error
2. **Empty States**: Lists should show "No items" message when empty
3. **Image Upload**: May need additional configuration for product images
4. **Role Permissions**: Ensure users can only access features for their role

## 📊 Test Results Summary

**Total Tests**: 80+
**Passed**: ___
**Failed**: ___
**Blocked**: ___

## 🚀 Ready for Production?

- [ ] All critical features tested
- [ ] No blocking bugs
- [ ] Performance acceptable
- [ ] Security reviewed
- [ ] Backend endpoints stable
