const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const {
    getSubscriptionStatus,
    createCheckout,
    cancelSubscription,
    getAllSubscriptionsForAdmin,
} = require('../controllers/subscriptionController');

router.get('/status', verifyToken, getSubscriptionStatus);
router.post('/create-checkout', verifyToken, createCheckout);
router.post('/cancel', verifyToken, cancelSubscription);

// Admin-only: overview of every seller subscription
router.get('/admin/all', verifyToken, getAllSubscriptionsForAdmin);

module.exports = router;
