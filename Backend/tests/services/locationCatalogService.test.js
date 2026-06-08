const {
  countryCodeFromName,
  countryNameFromCode,
  listCities,
  listCountries,
  listStates,
  resolveCountryCode,
} = require('../../services/locationCatalogService');

describe('locationCatalogService', () => {
  test('resolves country names and ISO codes from the catalog', () => {
    expect(countryNameFromCode('PK')).toBe('Pakistan');
    expect(countryCodeFromName('Pakistan')).toBe('PK');
    expect(resolveCountryCode({ country: 'United States' })).toBe('US');
  });

  test('searches countries, states, and cities with stable structured codes', () => {
    const countries = listCountries({ q: 'pak', limit: 5 });
    expect(countries[0]).toMatchObject({ name: 'Pakistan', isoCode: 'PK' });

    const states = listStates({ countryCode: 'PK', q: 'punj', limit: 5 });
    expect(states.some(state => state.name === 'Punjab' && state.isoCode === 'PB')).toBe(true);

    const cities = listCities({ countryCode: 'PK', stateCode: 'PB', q: 'lahore', limit: 5 });
    expect(cities.some(city => city.name === 'Lahore' && city.stateCode === 'PB')).toBe(true);
  });
});
