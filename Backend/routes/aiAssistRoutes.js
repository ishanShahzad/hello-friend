const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { improveDescription, generateTags } = require('../controllers/aiAssistController');

router.post('/improve-description', verifyToken, improveDescription);
router.post('/generate-tags', verifyToken, generateTags);

module.exports = router;
