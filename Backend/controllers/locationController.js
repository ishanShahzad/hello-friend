'use strict';

const {
  listCities,
  listCountries,
  listStates,
  resolveCountryCode,
  resolveStateCode,
} = require('../services/locationCatalogService');

exports.getCountries = (req, res) => {
  const countries = listCountries({
    q: req.query.q,
    limit: req.query.limit,
  });
  res.status(200).json({ countries });
};

exports.getStates = (req, res) => {
  const countryCode = resolveCountryCode({
    countryCode: req.query.countryCode,
    country: req.query.country,
  });

  if (!countryCode) {
    return res.status(400).json({ msg: 'Please select a valid country first.', states: [] });
  }

  const states = listStates({
    countryCode,
    q: req.query.q,
    limit: req.query.limit,
  });
  res.status(200).json({ countryCode, states });
};

exports.getCities = (req, res) => {
  const countryCode = resolveCountryCode({
    countryCode: req.query.countryCode,
    country: req.query.country,
  });

  if (!countryCode) {
    return res.status(400).json({ msg: 'Please select a valid country first.', cities: [] });
  }

  const stateCode = resolveStateCode({
    countryCode,
    stateCode: req.query.stateCode,
    state: req.query.state,
    region: req.query.region,
  });
  const cities = listCities({
    countryCode,
    stateCode,
    q: req.query.q,
    limit: req.query.limit,
  });

  res.status(200).json({ countryCode, stateCode, cities });
};
