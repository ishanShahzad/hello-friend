const express = require('express');
const { getSellerAnalytics, getSellerNotifications, getAdminAnalytics, getAdminNotifications, getNotificationPrefs, updateNotificationPrefs } = require('../controllers/analyticsController');
const verifyToken = require('../middleware/authMiddleware');
const bonusFeatureCheck = require('../middleware/bonusFeatureCheck');
const router = express.Router();

router.get('/seller', verifyToken, bonusFeatureCheck('Advanced Analytics'), getSellerAnalytics);
router.get('/notifications', verifyToken, getSellerNotifications);
router.get('/admin', verifyToken, getAdminAnalytics);
router.get('/admin/notifications', verifyToken, getAdminNotifications);
router.get('/notification-prefs', verifyToken, getNotificationPrefs);
router.put('/notification-prefs', verifyToken, updateNotificationPrefs);

module.exports = router;
