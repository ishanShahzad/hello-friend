const axios = require('axios');

const CURRENCIES = {
  USD: { symbol: '$', name: 'US Dollar', code: 'USD' },
  PKR: { symbol: 'Rs', name: 'Pakistani Rupee', code: 'PKR' },
  EUR: { symbol: 'EUR', name: 'Euro', code: 'EUR' },
  GBP: { symbol: 'GBP', name: 'British Pound', code: 'GBP' },
};

const FALLBACK_RATES = { USD: 1, PKR: 284.6, EUR: 0.92, GBP: 0.79 };
const CACHE_DURATION = 60 * 60 * 1000;

let exchangeRatesCache = null;
let lastFetchTime = 0;

function normalizeCurrency(currency) {
  const code = String(currency || 'USD').trim().toUpperCase();
  return CURRENCIES[code] ? code : 'USD';
}

async function getExchangeRates() {
  const now = Date.now();
  if (exchangeRatesCache && now - lastFetchTime < CACHE_DURATION) {
    return exchangeRatesCache;
  }

  let rates = null;
  try {
    const response = await axios.get('https://api.exchangerate.host/latest?base=USD&symbols=PKR,EUR,GBP', { timeout: 8000 });
    if (response.data?.success && response.data?.rates) {
      rates = {
        USD: 1,
        PKR: Number(response.data.rates.PKR) || FALLBACK_RATES.PKR,
        EUR: Number(response.data.rates.EUR) || FALLBACK_RATES.EUR,
        GBP: Number(response.data.rates.GBP) || FALLBACK_RATES.GBP,
      };
    }
  } catch (_) {}

  if (!rates) {
    try {
      const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', { timeout: 8000 });
      rates = {
        USD: 1,
        PKR: Number(response.data?.rates?.PKR) || FALLBACK_RATES.PKR,
        EUR: Number(response.data?.rates?.EUR) || FALLBACK_RATES.EUR,
        GBP: Number(response.data?.rates?.GBP) || FALLBACK_RATES.GBP,
      };
    } catch (_) {}
  }

  exchangeRatesCache = rates || FALLBACK_RATES;
  lastFetchTime = now;
  return exchangeRatesCache;
}

// Warm the cache so sync helpers have real rates after first ~1s of server life.
// Safe to call repeatedly — getExchangeRates short-circuits when fresh.
function warmRatesCache() {
  getExchangeRates().catch(() => {});
}

async function convertToUSD(amount, fromCurrency = 'USD') {
  const value = Number(amount || 0);
  const currency = normalizeCurrency(fromCurrency);
  if (!Number.isFinite(value)) return 0;
  if (currency === 'USD') return Math.round(value * 100) / 100;
  const rates = await getExchangeRates();
  const rate = Number(rates[currency]) || 1;
  return Math.round((value / rate) * 100) / 100;
}

async function convertFromUSD(amount, toCurrency = 'USD') {
  const value = Number(amount || 0);
  const currency = normalizeCurrency(toCurrency);
  if (!Number.isFinite(value)) return 0;
  if (currency === 'USD') return Math.round(value * 100) / 100;
  const rates = await getExchangeRates();
  const rate = Number(rates[currency]) || 1;
  return Math.round((value * rate) * 100) / 100;
}

function convertFromUSDSync(amount, toCurrency = 'USD') {
  const value = Number(amount || 0);
  const currency = normalizeCurrency(toCurrency);
  if (!Number.isFinite(value)) return 0;
  if (currency === 'USD') return Math.round(value * 100) / 100;
  const rates = exchangeRatesCache || FALLBACK_RATES;
  const rate = Number(rates[currency]) || 1;
  return Math.round((value * rate) * 100) / 100;
}

// Sync inverse: convert an arbitrary currency value into USD using cached rates.
// Used on every product read so buyers see CURRENT USD, never a stale snapshot.
function convertToUSDSync(amount, fromCurrency = 'USD') {
  const value = Number(amount || 0);
  const currency = normalizeCurrency(fromCurrency);
  if (!Number.isFinite(value)) return 0;
  if (currency === 'USD') return Math.round(value * 100) / 100;
  const rates = exchangeRatesCache || FALLBACK_RATES;
  const rate = Number(rates[currency]) || 1;
  return Math.round((value / rate) * 100) / 100;
}

/**
 * Mutate (or copy) a product so that `price` and `discountedPrice` are LIVE USD
 * recomputed from the seller's saved `priceOriginal`/`discountedPriceOriginal`
 * in `priceCurrency`. This is Option 1: no stored USD ever goes stale.
 *
 * Legacy products (no priceCurrency / no priceOriginal) are treated as USD
 * already — they pass through unchanged.
 *
 * Handles both Mongoose documents and lean POJOs. Triggers a non-blocking
 * rate refresh if the cache is empty so future calls get accurate rates.
 */
function applyLivePricesUSD(input) {
  if (!input) return input;
  if (!exchangeRatesCache) warmRatesCache();

  const convertOne = (raw) => {
    if (!raw || typeof raw !== 'object') return raw;
    // Convert Mongoose doc → plain object for safe mutation/serialization.
    const obj = typeof raw.toObject === 'function' ? raw.toObject() : raw;
    const currency = normalizeCurrency(obj.priceCurrency || 'USD');
    if (currency === 'USD') return obj; // already USD, nothing to do
    // priceOriginal is the seller's verbatim entered value (set at write time).
    // Fall back to `price` for legacy/edge rows.
    const original = obj.priceOriginal != null && obj.priceOriginal !== ''
      ? Number(obj.priceOriginal)
      : Number(obj.price);
    const discOriginal = obj.discountedPriceOriginal != null && obj.discountedPriceOriginal !== ''
      ? Number(obj.discountedPriceOriginal)
      : Number(obj.discountedPrice);
    if (Number.isFinite(original)) obj.price = convertToUSDSync(original, currency);
    if (Number.isFinite(discOriginal) && discOriginal > 0) {
      obj.discountedPrice = convertToUSDSync(discOriginal, currency);
    }
    return obj;
  };

  if (Array.isArray(input)) return input.map(convertOne);
  return convertOne(input);
}

/**
 * Apply live prices to populated product references inside a parent object,
 * e.g. cart.cartItems[].product or order.orderItems[].productId.
 */
function applyLivePricesToPopulated(items, key = 'product') {
  if (!Array.isArray(items)) return items;
  return items.map((item) => {
    if (!item) return item;
    const plain = typeof item.toObject === 'function' ? item.toObject() : item;
    if (plain[key] && typeof plain[key] === 'object') {
      plain[key] = applyLivePricesUSD(plain[key]);
    }
    return plain;
  });
}

async function formatMoney(amountInUSD, currency = 'USD', { decimals = 2 } = {}) {
  const code = normalizeCurrency(currency);
  const amount = await convertFromUSD(amountInUSD, code);
  const symbol = CURRENCIES[code].symbol;
  return `${symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${code === 'USD' ? '' : ` ${code}`}`;
}

function formatMoneySync(amountInUSD, currency = 'USD', { decimals = 2 } = {}) {
  const code = normalizeCurrency(currency);
  const amount = convertFromUSDSync(amountInUSD, code);
  const symbol = CURRENCIES[code].symbol;
  return `${symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${code === 'USD' ? '' : ` ${code}`}`;
}

module.exports = {
  CURRENCIES,
  FALLBACK_RATES,
  normalizeCurrency,
  getExchangeRates,
  warmRatesCache,
  convertToUSD,
  convertFromUSD,
  convertToUSDSync,
  convertFromUSDSync,
  applyLivePricesUSD,
  applyLivePricesToPopulated,
  formatMoney,
  formatMoneySync,
};
