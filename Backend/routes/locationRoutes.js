const express = require('express');
const router = express.Router();
const {
  getCities,
  getCountries,
  getStates,
} = require('../controllers/locationController');

router.get('/countries', getCountries);
router.get('/states', getStates);
router.get('/cities', getCities);

module.exports = router;
