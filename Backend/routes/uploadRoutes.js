const express = require('express')
const { profileImage } = require('../controllers/uploadController')
const upload = require('../middleware/upload')
const verifyToken = require('../middleware/authMiddleware')
const router = express.Router()

router.post('/profile-image', verifyToken, upload.single('profileImage'), profileImage)

module.exports = router   