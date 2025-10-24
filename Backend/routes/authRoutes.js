

const express = require('express')
const { registerr, login } = require('../controllers/authController')
const router = express.Router()

router.post('/registerr', registerr)
router.post('/login', login)
// router.post('/login', )

module.exports = router