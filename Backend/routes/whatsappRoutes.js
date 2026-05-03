const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { admin } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/whatsappController');

// Admin-only management
router.get('/status', verifyToken, admin, ctrl.getStatus);
router.post('/connect', verifyToken, admin, ctrl.connect);
router.post('/disconnect', verifyToken, admin, ctrl.disconnect);
router.post('/reset', verifyToken, admin, ctrl.reset);
router.post('/pairing-code', verifyToken, admin, ctrl.requestPairingCode);
router.get('/queue', verifyToken, admin, ctrl.getQueue);
router.post('/queue/:id/retry', verifyToken, admin, ctrl.retryQueueItem);
router.get('/stats', verifyToken, admin, ctrl.getStats);

// Seller-instance management (admin only)
router.get('/seller/status', verifyToken, admin, ctrl.getSellerStatus);
router.post('/seller/connect', verifyToken, admin, ctrl.sellerConnect);
router.post('/seller/disconnect', verifyToken, admin, ctrl.sellerDisconnect);
router.post('/seller/reset', verifyToken, admin, ctrl.sellerReset);
router.post('/seller/pairing-code', verifyToken, admin, ctrl.sellerRequestPairingCode);

// Public webhook (validated via shared secret in handler)
router.post('/webhook', ctrl.webhook);

module.exports = router;
