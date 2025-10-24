# Quick Test Guide - Spin Wheel Feature

## 🚀 Start Testing in 30 Seconds

### Step 1: Clear Data
Open browser console (F12) and run:
```javascript
localStorage.clear();
location.reload();
```

### Step 2: Spin the Wheel
1. Visit homepage
2. Spin wheel appears automatically
3. Click "SPIN NOW"
4. Wait 5 seconds for result

### Step 3: Verify Discount
✅ Banner shows: "🎉 You Won: 60% OFF" (or similar)
✅ Timer shows: "23h 59m left"
✅ Products show discounted prices immediately
✅ "0/3 Selected" appears

### Step 4: Test Cart (Guest)
1. Click "Add to Cart" on any product
2. ✅ Should redirect to login page

### Step 5: Test Cart (Logged In)
1. Login to your account
2. Add 3 products to cart
3. ✅ Banner updates: "1/3", "2/3", "3/3 Selected"
4. Try to add 4th product
5. ✅ Error: "You can only select 3 products"

### Step 6: Test Quantity
1. In cart, try to increase quantity
2. ✅ Error: "Cannot increase quantity for spin discount products!"

## ✅ Success Criteria

- [ ] Spin wheel appears on first visit
- [ ] Discount applies immediately (no reload)
- [ ] Banner shows correct discount text
- [ ] Timer shows remaining time
- [ ] Guest users redirected to login for cart
- [ ] Max 3 products can be selected
- [ ] Quantity locked at 1 per product
- [ ] Spin wheel doesn't appear again for 24 hours

## 🔄 Reset Test

To test again:
```javascript
localStorage.clear();
location.reload();
```

## 📊 Expected Discounts

| Prize | Product $100 | Product $50 |
|-------|-------------|-------------|
| 40% OFF | $60 | $30 |
| 60% OFF | $40 | $20 |
| 80% OFF | $20 | $10 |
| 99% OFF | $1 | $0.50 |
| $0.99 | $0.99 | $0.99 |
| FREE | $0.00 | $0.00 |

## 🐛 If Something's Wrong

1. Check browser console for errors
2. Verify localStorage:
```javascript
console.log(localStorage.getItem('spinResult'));
console.log(localStorage.getItem('spinTimestamp'));
```
3. Clear and try again
4. Check both servers are running

## 🎯 Quick Checklist

```
✅ Spin wheel shows
✅ Discount applies
✅ Banner correct
✅ Timer works
✅ Login required for cart
✅ 3 product limit
✅ Quantity locked
✅ 24h cooldown
```

---

**All tests passing?** → Ready for production! 🎉
