const express = require('express')
const { profileImage, productImage } = require('../controllers/uploadController')
const upload = require('../middleware/upload')
const verifyToken = require('../middleware/authMiddleware')
const router = express.Router()

router.post('/profile-image', verifyToken, upload.single('profileImage'), profileImage)
router.post('/product-image', verifyToken, upload.single('productImage'), productImage)

module.exports = router   