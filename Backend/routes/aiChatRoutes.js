const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { streamChat, chatOnce } = require('../controllers/aiChatController');

/**
 * Optional auth:
 *  - If a valid JWT is present, attach req.user.
 *  - If missing/invalid, continue as guest (role = 'guest').
 *
 * We explicitly DO NOT trust any `role` field sent by the client body —
 * the role used by the AI controller is always derived from the JWT.
 */
const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      // Invalid token — continue as guest
    }
  }
  next();
};

// Streaming SSE endpoint (primary)
router.post('/stream', optionalAuth, streamChat);

// Non-streaming JSON endpoint (for mobile / fallback)
router.post('/once', optionalAuth, chatOnce);

module.exports = router;
