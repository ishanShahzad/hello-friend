const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { optionalAuth } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/sellerWhatsappController');

// Public (used during signup flow) BUT uses optional auth so authenticated
// sellers are recognized (their user record is auto-updated on verify).
router.post('/send-otp', optionalAuth, ctrl.sendWhatsAppOTP);
router.post('/verify-otp', optionalAuth, ctrl.verifyWhatsAppOTP);

// Seller-only (authenticated)
router.get('/prefs', verifyToken, ctrl.getWhatsAppPrefs);
router.put('/prefs', verifyToken, ctrl.updateWhatsAppPrefs);

module.exports = router;
