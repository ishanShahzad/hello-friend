const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const {
    getSubscriptionStatus,
    createCheckout,
    cancelSubscription,
} = require('../controllers/subscriptionController');

router.get('/status', verifyToken, getSubscriptionStatus);
router.post('/create-checkout', verifyToken, createCheckout);
router.post('/cancel', verifyToken, cancelSubscription);

module.exports = router;
