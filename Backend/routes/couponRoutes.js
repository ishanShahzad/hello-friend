const express = require('express');
const verifyToken = require('../middleware/authMiddleware');
const bonusFeatureCheck = require('../middleware/bonusFeatureCheck');
const {
    createCoupon,
    getSellerCoupons,
    updateCoupon,
    deleteCoupon,
    toggleCoupon,
    validateCoupon,
    getCheckoutCoupons,
    getCouponAnalytics,
    getProductCoupons,
    getStoreCoupons,
} = require('../controllers/couponController');

const router = express.Router();

// Seller routes (bonus feature restricted)
router.post('/create', verifyToken, bonusFeatureCheck('Coupon Management'), createCoupon);
router.get('/seller', verifyToken, bonusFeatureCheck('Coupon Management'), getSellerCoupons);
router.get('/analytics', verifyToken, bonusFeatureCheck('Coupon Management'), getCouponAnalytics);
router.put('/update/:id', verifyToken, bonusFeatureCheck('Coupon Management'), updateCoupon);
router.delete('/delete/:id', verifyToken, bonusFeatureCheck('Coupon Management'), deleteCoupon);
router.patch('/toggle/:id', verifyToken, bonusFeatureCheck('Coupon Management'), toggleCoupon);

// Public routes (no auth needed for buyers to see available coupons)
router.get('/product/:productId', getProductCoupons);
router.get('/store/:sellerId', getStoreCoupons);

// Checkout routes (buyers apply coupons — no restriction)
router.post('/validate', verifyToken, validateCoupon);
router.post('/checkout-coupons', verifyToken, getCheckoutCoupons);

module.exports = router;
