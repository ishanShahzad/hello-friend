/**
 * Tests for invoice utility (PDF generation + sharing wrapper).
 */

jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(async () => ({ uri: 'file:///tmp/invoice.pdf' })),
  printAsync: jest.fn(async () => true),
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => true),
}));
jest.mock('../../src/config/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(async () => ({
      data: { html: '<html><body>Invoice</body></html>', orderId: 'INV-123' },
    })),
  },
}));

const Print = require('expo-print');
const Sharing = require('expo-sharing');
const api = require('../../src/config/api').default;
const { shareInvoice, printInvoice } = require('../../src/utils/invoiceUtils');

beforeEach(() => jest.clearAllMocks());

describe('shareInvoice', () => {
  test('fetches HTML, prints to PDF, and opens share sheet', async () => {
    const result = await shareInvoice('order_abc');
    expect(api.get).toHaveBeenCalledWith(expect.stringContaining('order_abc'));
    expect(Print.printToFileAsync).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.stringContaining('Invoice'),
    }));
    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      'file:///tmp/invoice.pdf',
      expect.objectContaining({ mimeType: 'application/pdf' })
    );
    expect(result).toEqual({ uri: 'file:///tmp/invoice.pdf', shared: true });
  });

  test('returns shared:false when sharing is unavailable', async () => {
    Sharing.isAvailableAsync.mockResolvedValueOnce(false);
    const result = await shareInvoice('order_abc');
    expect(result.shared).toBe(false);
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });

  test('throws on missing orderId', async () => {
    await expect(shareInvoice(undefined)).rejects.toThrow(/orderId/);
  });

  test('throws when backend returns no HTML', async () => {
    api.get.mockResolvedValueOnce({ data: {} });
    await expect(shareInvoice('order_abc')).rejects.toThrow(/invoice HTML/);
  });
});

describe('printInvoice', () => {
  test('fetches HTML and calls system print dialog', async () => {
    await printInvoice('order_abc');
    expect(Print.printAsync).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.any(String),
    }));
  });
});
