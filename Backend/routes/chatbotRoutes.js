const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const {
    chat,
    getUserContext,
    submitComplaint,
    getMyComplaints,
    getAllComplaints,
    updateComplaint
} = require('../controllers/chatbotController');

// Optional auth middleware (doesn't block guests)
const optionalAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
        const jwt = require('jsonwebtoken');
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
        } catch (e) { /* guest user */ }
    }
    next();
};

// Chat endpoint (works for both authenticated and guest users)
router.post('/chat', optionalAuth, chat);

// User context for AI personalization (authenticated)
router.get('/user-context', verifyToken, getUserContext);

// Complaint routes (authenticated)
router.post('/complaint', verifyToken, submitComplaint);
router.get('/my-complaints', verifyToken, getMyComplaints);
router.get('/complaints', verifyToken, getAllComplaints); // admin
router.put('/complaint/:id', verifyToken, updateComplaint); // admin

module.exports = router;
