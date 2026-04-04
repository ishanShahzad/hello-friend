
## Missing Features in Mobile App

### 1. **Track Order Screen** (NEW)
- Guest order tracking via email + order ID
- Status progress bar, shipping info, order items display
- Matches web's `TrackOrderPage.jsx`

### 2. **Guest Checkout** 
- Mobile currently blocks non-logged-in users from checkout
- Web allows guest checkout (no login required)
- Need to remove login gate in CartScreen + CheckoutScreen

### 3. **Seller Signup Screen** (NEW)
- Web has a dedicated 4-step seller registration: Account → Business → Store Setup → OTP
- Mobile only has user SignUp + BecomeSeller (no dedicated seller signup)
- Need to create `SellerSignUpScreen` with all 4 steps

### 4. **Store Setup in BecomeSeller**
- Web's BecomeSeller includes store name, description, website, social media links
- Mobile's BecomeSeller only has phone, address, city, country, business name
- Need to add Step 2 with store setup fields

### 5. **Coupon Management Screen** (NEW for Sellers)
- Web has full CouponManagement with create/edit/delete coupons + analytics
- Mobile has no coupon management for sellers at all
- Need to create `SellerCouponManagementScreen`

### 6. **Coupon Support in Checkout**
- Web checkout has coupon input, validation, and discount display
- Mobile checkout has no coupon support
- Need to add coupon input section in CheckoutScreen

### 7. **Store-First Requirement in ProductManagement**
- Web shows "Store Required" warning and disables Add Product if seller has no store
- Mobile has no such check
- Need to add hasStore check in ProductManagementScreen

### 8. **Navigation Updates**
- Add TrackOrder to navigation stack
- Add SellerSignUp to navigation stack  
- Add CouponManagement to seller navigation
- Add Track Order option in SettingsScreen (like Footer link on web)

## Implementation Order
1. TrackOrderScreen + navigation
2. Guest checkout updates
3. Store setup in BecomeSeller
4. Store-first check in ProductManagement
5. Coupon support in Checkout
6. SellerSignUpScreen
7. CouponManagementScreen
8. Navigation/settings updates
