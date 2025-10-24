
const express = require('express')
const { getUsers, toggleBlockUser, toggleAdminUser, deleteUser, getSingle, updateUser } = require('../controllers/userController')
const verifyToken = require('../middleware/authMiddleware')
const router = express.Router()

router.get('/get', verifyToken, getUsers)
router.patch('/block-toggle/:id' , verifyToken, toggleBlockUser)
router.patch('/admin-toggle/:id' , verifyToken, toggleAdminUser)
router.delete('/delete/:id' , verifyToken, deleteUser)
router.get('/single' , verifyToken, getSingle)
router.patch('/update' , verifyToken, updateUser)

module.exports = router