const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const ctrl = require('../controllers/userWhatsappController');

// All routes require authentication
router.post('/send-otp', verifyToken, ctrl.sendUserWhatsAppOTP);
router.post('/verify-otp', verifyToken, ctrl.verifyUserWhatsAppOTP);
router.post('/unlink', verifyToken, ctrl.unlinkUserWhatsApp);
router.get('/status', verifyToken, ctrl.getUserWhatsAppStatus);

module.exports = router;
