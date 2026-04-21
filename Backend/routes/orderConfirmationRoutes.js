const express = require('express');
const { getConfirmationDetails, confirmOrder, declineOrder } = require('../controllers/orderConfirmationController');
const router = express.Router();

// Public — token IS the auth
router.get('/:token', getConfirmationDetails);
router.post('/:token/confirm', confirmOrder);
router.post('/:token/decline', declineOrder);

module.exports = router;
