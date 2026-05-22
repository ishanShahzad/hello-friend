const express = require('express');
const verifyToken = require('../middleware/authMiddleware');
const {
    getSellerPaymentSummary,
    upsertSellerPaymentAccount,
    createWithdrawalRequest,
    getSellerWithdrawals,
    getAdminPaymentsOverview,
    updateWithdrawalRequestStatus,
} = require('../controllers/PaymentController');

const router = express.Router();

router.get('/seller/summary', verifyToken, getSellerPaymentSummary);
router.put('/seller/account', verifyToken, upsertSellerPaymentAccount);
router.post('/seller/withdrawals', verifyToken, createWithdrawalRequest);
router.get('/seller/withdrawals', verifyToken, getSellerWithdrawals);

router.get('/admin/overview', verifyToken, getAdminPaymentsOverview);
router.patch('/admin/withdrawals/:id', verifyToken, updateWithdrawalRequestStatus);

module.exports = router;
