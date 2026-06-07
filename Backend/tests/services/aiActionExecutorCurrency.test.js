const { __private } = require('../../services/aiActionExecutor');

describe('aiActionExecutor currency resolution', () => {
  test('keeps seller preferred currency when model emits USD for a plain number', () => {
    expect(__private.resolveAIPriceCurrency({
      value: 2500,
      requestedCurrency: 'USD',
      preferredCurrency: 'PKR',
      lastUserText: 'add cotton shirt for 2500',
    })).toBe('PKR');
  });

  test('honors explicit currency aliases from import rows', () => {
    expect(__private.resolveAIPriceCurrency({
      value: 2500,
      requestedCurrency: 'Pakistani Rupee',
      preferredCurrency: 'USD',
      lastUserText: 'import these products',
    })).toBe('PKR');

    expect(__private.resolveAIPriceCurrency({
      value: 35,
      requestedCurrency: 'British pounds',
      preferredCurrency: 'USD',
      lastUserText: 'import these products',
    })).toBe('GBP');
  });

  test('lets explicit price text beat the preferred currency', () => {
    expect(__private.resolveAIPriceCurrency({
      value: '€19.99',
      requestedCurrency: 'USD',
      preferredCurrency: 'PKR',
      lastUserText: 'add this accessory',
    })).toBe('EUR');
  });
});
