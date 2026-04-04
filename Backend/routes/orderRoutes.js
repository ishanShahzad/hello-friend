
const express = require('express')
const { placeOrder, getOrders, updateStatus, getOrderDetail, cancelOrder, getUserOrders, trackGuestOrder } = require('../controllers/orderController')
const verifyToken = require('../middleware/authMiddleware')
const router = express.Router()

// Optional auth middleware - sets req.user if token present, but doesn't reject
const optionalAuth = async (req, res, next) => {
    const authHeader = req.header('Authorization')
    const token = authHeader?.split(' ')[1]
    if (!token) return next()
    try {
        const jwt = require('jsonwebtoken')
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = decoded
    } catch (e) { /* ignore invalid token for guest */ }
    next()
}

router.post('/place', optionalAuth, placeOrder)
router.get('/track', trackGuestOrder)
router.get('/get', verifyToken, getOrders)
router.get('/user-orders', verifyToken, getUserOrders)
router.patch('/update-status/:id', verifyToken, updateStatus)
router.get('/detail/:id', verifyToken, getOrderDetail)
router.patch('/cancel/:id', verifyToken, cancelOrder)

module.exports = router