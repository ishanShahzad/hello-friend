
const express = require('express')
const { forgotPassword, resetPassword, changePassword } = require('../controllers/ResetPasswordController')
const verifyToken = require('../middleware/authMiddleware')
const router = express.Router()

router.post('/forgot', forgotPassword)
router.post('/reset/:token', resetPassword)
router.patch('/change',verifyToken, changePassword)

module.exports = router