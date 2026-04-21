const express = require('express');
const router = express.Router();
const { 
  trustStore, 
  untrustStore, 
  getTrustStatus, 
  getTrustedStores,
  getTrustMetrics
} = require('../controllers/trustController');
const { protect } = require('../middleware/authMiddleware');

// Get all trusted stores for the authenticated user (must be first to avoid conflict with /:storeId)
router.get('/trusted', protect, getTrustedStores);

// Trust/untrust a specific store
router.post('/:storeId/trust', protect, trustStore);
router.delete('/:storeId/trust', protect, untrustStore);

// Get trust status for a specific store
router.get('/:storeId/trust-status', protect, getTrustStatus);

// Public — full trust score breakdown
router.get('/:storeId/trust-metrics', getTrustMetrics);

module.exports = router;
