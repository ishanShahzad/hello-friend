/**
 * Tests for invoice utility (PDF generation + sharing wrapper).
 */

jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(async () => ({ uri: 'file:///tmp/invoice.pdf' })),
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => true),
}));
jest.mock('../../src/config/api', () => ({
  __esModule: true,
  default: { get: jest.fn(async () => ({ data: { html: '<html><body>Invoice</body></html>' } })) },
}));

const Print = require('expo-print');
const Sharing = require('expo-sharing');
const api = require('../../src/config/api').default;
const { generateAndShareInvoice } = require('../../src/utils/invoiceUtils');

beforeEach(() => jest.clearAllMocks());

describe('generateAndShareInvoice', () => {
  test('fetches HTML, prints to PDF, and shares', async () => {
    await generateAndShareInvoice('order_abc');
    expect(api.get).toHaveBeenCalledWith(expect.stringContaining('order_abc'));
    expect(Print.printToFileAsync).toHaveBeenCalled();
    expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///tmp/invoice.pdf', expect.any(Object));
  });

  test('returns false when sharing is unavailable', async () => {
    Sharing.isAvailableAsync.mockResolvedValueOnce(false);
    const result = await generateAndShareInvoice('order_abc');
    expect(result).toBe(false);
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });

  test('returns false on API failure and does not crash', async () => {
    api.get.mockRejectedValueOnce(new Error('server down'));
    const result = await generateAndShareInvoice('order_abc');
    expect(result).toBe(false);
  });
});
