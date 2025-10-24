

const express = require('express')
const { getSession } = require('../controllers/sesssionController')
const router = express.Router()

router.get('/:id', getSession)

module.exports = router