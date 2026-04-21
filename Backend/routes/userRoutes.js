
const express = require('express')
const { getUsers, toggleBlockUser, toggleAdminUser, deleteUser, deleteOwnAccount, getSingle, updateUser, becomeSeller, getShippingInfo, updateShippingInfo, getAddresses, addAddress, updateAddress, deleteAddress, setDefaultAddress, savePushToken, removePushToken } = require('../controllers/userController')
const verifyToken = require('../middleware/authMiddleware')
const router = express.Router()

router.get('/get', verifyToken, getUsers)
router.patch('/block-toggle/:id' , verifyToken, toggleBlockUser)
router.patch('/admin-toggle/:id' , verifyToken, toggleAdminUser)
router.delete('/delete/:id' , verifyToken, deleteUser)
router.get('/single' , verifyToken, getSingle)
router.patch('/update' , verifyToken, updateUser)

// Self-deletion (any logged-in user can delete their own account)
router.delete('/delete-account', verifyToken, deleteOwnAccount)

// Become a seller
router.post('/become-seller', verifyToken, becomeSeller)

// Shipping info (single default for back-compat)
router.get('/shipping-info', verifyToken, getShippingInfo)
router.patch('/shipping-info', verifyToken, updateShippingInfo)

// Saved Addresses (address book) — multi-address CRUD
router.get('/addresses', verifyToken, getAddresses)
router.post('/addresses', verifyToken, addAddress)
router.patch('/addresses/:addressId', verifyToken, updateAddress)
router.delete('/addresses/:addressId', verifyToken, deleteAddress)
router.patch('/addresses/:addressId/default', verifyToken, setDefaultAddress)

// Expo push notification token registration
router.post('/push-token', verifyToken, savePushToken)
router.delete('/push-token', verifyToken, removePushToken)

module.exports = router
