const express = require('express');
const { detectCurrency, getExchangeRates, getCurrencies, updateUserCurrency } = require('../controllers/currencyController');
const verifyToken = require('../middleware/authMiddleware');
const router = express.Router();

// Public routes
router.get('/detect', detectCurrency);
router.get('/rates', getExchangeRates);
router.get('/list', getCurrencies);

// Protected routes
router.patch('/update', verifyToken, updateUserCurrency);

module.exports = router;
