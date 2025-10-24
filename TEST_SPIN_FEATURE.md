# Testing the Spin Wheel Feature

## Quick Test Guide

### Test 1: Guest User Experience
1. Open browser in incognito/private mode
2. Navigate to `http://localhost:5173` (or your frontend URL)
3. **Expected**: Spin wheel modal appears immediately
4. Click "SPIN NOW"
5. **Expected**: Wheel spins and shows a prize (e.g., "60% OFF")
6. **Expected**: Products immediately show discounted prices (no reload needed)
7. Try to add a product to cart
8. **Expected**: Redirected to login page with message "Please login to add items to cart"

### Test 2: Spin Wheel Once Per Day
1. After spinning once, refresh the page
2. **Expected**: Spin wheel does NOT appear again
3. Products still show the discount from previous spin
4. Open browser console and run:
   ```javascript
   localStorage.getItem('spinResult')
   localStorage.getItem('spinTimestamp')
   ```
5. **Expected**: Both values are present

### Test 3: Spin Expiration (24 Hours)
To test without waiting 24 hours:
1. Open browser console
2. Run this code to simulate expired spin:
   ```javascript
   const yesterday = new Date().getTime() - (25 * 60 * 60 * 1000);
   localStorage.setItem('spinTimestamp', yesterday.toString());
   ```
3. Refresh the page
4. **Expected**: Spin wheel appears again (old spin expired)

### Test 4: Logged In User - Add to Cart
1. Login to your account
2. Spin the wheel (if not already spun)
3. Add a product to cart
4. **Expected**: Product added successfully with spin discount
5. Try to increase quantity of that product
6. **Expected**: Error message "Cannot increase quantity for spin discount products! Only 1 item allowed."

### Test 5: Maximum 3 Products Limit
1. With an active spin discount, add 3 products to cart
2. Try to add a 4th product
3. **Expected**: Error message "You can only select 3 products with your spin discount!"

### Test 6: Checkout Requires Login
1. Logout (or use incognito mode)
2. Try to navigate to `http://localhost:5173/checkout`
3. **Expected**: Redirected to login page

### Test 7: Discount Applies Dynamically
1. Before spinning, note a product's price (e.g., $100)
2. Spin the wheel and win "60% OFF"
3. **Expected**: Product price immediately changes to $40 (no page reload)
4. The original price shows as strikethrough

### Test 8: Wishlist Requires Login
1. As guest user, click the heart icon on any product
2. **Expected**: Redirected to login page

## Clear Test Data

To reset and test again:
```javascript
// Run in browser console
localStorage.removeItem('spinResult');
localStorage.removeItem('spinTimestamp');
localStorage.removeItem('spinSelectedProducts');
location.reload();
```

## Expected Spin Prizes

The wheel has 6 segments:
- 40% OFF
- All products FREE (100% off)
- 60% OFF
- All products $0.99
- 80% OFF
- 99% OFF

Note: The wheel is rigged to land on "All products FREE" or "All products $0.99" for better user experience.

## Common Issues & Solutions

### Issue: Spin wheel doesn't appear
**Solution**: Clear localStorage and refresh
```javascript
localStorage.clear();
location.reload();
```

### Issue: Discount not applying
**Solution**: Check browser console for errors, ensure spinResult is in localStorage

### Issue: Can't add to cart
**Solution**: Make sure you're logged in. Guest users must login first.

### Issue: Quantity increase blocked for all products
**Solution**: Check if product is in spinSelectedProducts array:
```javascript
JSON.parse(localStorage.getItem('spinSelectedProducts'))
```

## Success Criteria

✅ All users see spin wheel on first visit  
✅ Discount applies immediately without reload  
✅ Guest users redirected to login for cart/wishlist  
✅ Logged in users can add max 3 products with spin discount  
✅ Quantity limited to 1 for spin products  
✅ Spin wheel shows once per 24 hours  
✅ Checkout requires login  
✅ Code is simple and easy to understand  
