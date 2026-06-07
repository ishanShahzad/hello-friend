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

describe('aiActionExecutor product currency conversion notice', () => {
  test('explains when an explicit price currency is converted to store product currency', async () => {
    const notice = await __private.buildProductCurrencyConversionNotice({
      sourceAmount: 10,
      sourceCurrency: 'USD',
      savedAmount: 2846,
      productCurrency: 'PKR',
    });

    expect(notice).toContain('Your selected product currency is PKR');
    expect(notice).toContain("can't save this product in USD");
    expect(notice).toContain('converted');
    expect(notice).toContain('saved that as the product price');
  });

  test('does not add a conversion notice when input already matches product currency', async () => {
    await expect(__private.buildProductCurrencyConversionNotice({
      sourceAmount: 1000,
      sourceCurrency: 'PKR',
      savedAmount: 1000,
      productCurrency: 'PKR',
    })).resolves.toBe('');
  });
});
