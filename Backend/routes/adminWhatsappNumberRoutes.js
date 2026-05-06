const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { admin } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/adminWhatsappNumberController');

// All routes require admin authentication
router.get('/', verifyToken, admin, ctrl.getAdminNumbers);
router.post('/', verifyToken, admin, ctrl.addAdminNumber);
router.delete('/:id', verifyToken, admin, ctrl.removeAdminNumber);
router.patch('/:id', verifyToken, admin, ctrl.toggleAdminNumber);

module.exports = router;
