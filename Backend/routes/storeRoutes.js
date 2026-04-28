const express = require('express');
const router = express.Router();
const {
    createStore,
    getMyStore,
    updateStore,
    deleteStore,
    searchStores,
    getStoreSuggestions,
    getStoreBySlug,
    getStoreBySellerId,
    getStoreProducts,
    getAllStores,
    incrementStoreView,
    getStoreAnalytics,
    applyForVerification,
    getVerificationStatus,
    getPendingVerifications,
    getVerifiedStores,
    approveVerification,
    rejectVerification,
    removeVerification,
    checkSubdomainAvailability
} = require('../controllers/storeController');
const verifyToken = require('../middleware/authMiddleware');
const User = require('../models/User');

// Middleware to check if user is a seller (reads live role from DB so a freshly
// promoted seller doesn't get blocked by an older JWT still claiming role: 'user')
const isSellerAuth = async (req, res, next) => {
    try {
        if (req.user?.role === 'seller') return next();
        const userId = req.user?._id || req.user?.id;
        if (!userId) return res.status(401).json({ msg: 'Authentication required' });
        const user = await User.findById(userId).select('role');
        if (!user) return res.status(404).json({ msg: 'User not found' });
        if (user.role !== 'seller') {
            return res.status(403).json({ msg: 'Seller access only' });
        }
        req.user.role = 'seller';
        next();
    } catch (err) {
        console.error('isSellerAuth error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Middleware to validate store data
const validateStoreData = (req, res, next) => {
    const { storeName, description } = req.body;

    if (storeName && storeName.trim().length < 3) {
        return res.status(400).json({ msg: 'Store name must be at least 3 characters' });
    }

    if (storeName && storeName.length > 50) {
        return res.status(400).json({ msg: 'Store name cannot exceed 50 characters' });
    }

    if (description && description.length > 500) {
        return res.status(400).json({ msg: 'Description cannot exceed 500 characters' });
    }

    next();
};

// Store Management Routes (Seller only)
router.post('/create', verifyToken, isSellerAuth, validateStoreData, createStore);
router.get('/my-store', verifyToken, isSellerAuth, getMyStore);
router.put('/update', verifyToken, isSellerAuth, validateStoreData, updateStore);
router.delete('/delete', verifyToken, isSellerAuth, deleteStore);
router.get('/analytics', verifyToken, isSellerAuth, getStoreAnalytics);

// Verification Routes (Seller)
router.post('/verification/apply', verifyToken, isSellerAuth, applyForVerification);
router.get('/verification/status', verifyToken, isSellerAuth, getVerificationStatus);

// Verification Routes (Admin only)
router.get('/verification/pending', verifyToken, getPendingVerifications);
router.get('/verification/verified', verifyToken, getVerifiedStores);
router.put('/verification/:storeId/approve', verifyToken, approveVerification);
router.put('/verification/:storeId/reject', verifyToken, rejectVerification);
router.put('/verification/:storeId/remove', verifyToken, removeVerification);

// Public Store Routes - Order matters! Specific routes before dynamic params
router.get('/search', searchStores);
router.get('/suggestions', getStoreSuggestions);
router.get('/all', getAllStores);
router.get('/seller/:id', getStoreBySellerId);
router.get('/check-subdomain/:slug', verifyToken, checkSubdomainAvailability); // Check availability
router.get('/:slug/products', getStoreProducts);
router.post('/:slug/view', incrementStoreView);
router.get('/:slug', getStoreBySlug); // This must be last

module.exports = router;
