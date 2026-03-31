const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const ai = require('../controllers/aiActionController');

// Optional auth (for guests)
const optionalAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
        const jwt = require('jsonwebtoken');
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
        } catch (e) { /* guest */ }
    }
    next();
};

// Rate Limit
router.get('/rate-limit', optionalAuth, ai.getRateLimit);
router.post('/rate-limit/increment', optionalAuth, ai.incrementRateLimit);

// Seller actions (require auth)
router.post('/add-product', verifyToken, ai.addProduct);
router.post('/edit-product', verifyToken, ai.editProduct);
router.post('/delete-product', verifyToken, ai.deleteProduct);
router.get('/my-products', verifyToken, ai.listMyProducts);
router.post('/bulk-discount', verifyToken, ai.bulkDiscount);
router.post('/bulk-price-update', verifyToken, ai.bulkPriceUpdate);
router.post('/remove-discount', verifyToken, ai.removeDiscount);
router.get('/seller-analytics', verifyToken, ai.getSellerAnalytics);
router.get('/seller-orders', verifyToken, ai.getSellerOrders);
router.post('/update-order-status', verifyToken, ai.updateOrderStatus);
router.get('/my-store', verifyToken, ai.getMyStore);
router.post('/update-store', verifyToken, ai.updateStore);
router.get('/store-analytics', verifyToken, ai.getStoreAnalytics);
router.post('/apply-verification', verifyToken, ai.applyForVerification);
router.get('/shipping-methods', verifyToken, ai.getShippingMethods);
router.post('/update-shipping', verifyToken, ai.updateShipping);

// Admin actions
router.get('/all-users', verifyToken, ai.getAllUsers);
router.post('/delete-user', verifyToken, ai.deleteUser);
router.post('/block-user', verifyToken, ai.blockUser);
router.post('/change-user-role', verifyToken, ai.changeUserRole);
router.get('/admin-analytics', verifyToken, ai.getAdminAnalytics);
router.get('/all-orders', verifyToken, ai.getAllOrders);
router.get('/order-detail', verifyToken, ai.getOrderDetail);
router.post('/cancel-order', verifyToken, ai.cancelOrder);
router.get('/all-complaints', verifyToken, ai.getAllComplaints);
router.post('/update-complaint', verifyToken, ai.updateComplaint);
router.get('/pending-verifications', verifyToken, ai.getPendingVerifications);
router.post('/approve-verification', verifyToken, ai.approveVerification);
router.post('/reject-verification', verifyToken, ai.rejectVerification);
router.post('/remove-verification', verifyToken, ai.removeVerification);
router.get('/all-stores', verifyToken, ai.getAllStores);
router.post('/update-tax', verifyToken, ai.updateTaxConfig);
router.get('/tax-config', verifyToken, ai.getTaxConfig);
router.get('/search-products', ai.searchProducts);

module.exports = router;
