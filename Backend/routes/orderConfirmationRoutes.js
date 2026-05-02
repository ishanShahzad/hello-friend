const express = require('express');
const { getConfirmationDetails, confirmOrder, declineOrder, reconfirmOrder } = require('../controllers/orderConfirmationController');
const router = express.Router();

// Public — token IS the auth
router.get('/:token', getConfirmationDetails);
router.post('/:token/confirm', confirmOrder);
router.post('/:token/decline', declineOrder);
router.post('/:token/reconfirm', reconfirmOrder);

module.exports = router;
