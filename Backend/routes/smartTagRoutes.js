const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/authMiddleware')
const bonusFeatureCheck = require('../middleware/bonusFeatureCheck')
const { generateProductTags, bulkGenerateTags, getTagSuggestions } = require('../controllers/smartTagController')

// Generate tags for a single product
router.post('/generate/:productId', verifyToken, bonusFeatureCheck('Smart Tag Generator'), generateProductTags)

// Bulk generate tags for multiple products
router.post('/bulk-generate', verifyToken, bonusFeatureCheck('Smart Tag Generator'), bulkGenerateTags)

// Get tag suggestions for a new product (public, no restriction)
router.post('/suggestions', getTagSuggestions)

module.exports = router
