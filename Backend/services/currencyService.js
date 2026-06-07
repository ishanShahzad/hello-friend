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

function roundMoney(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
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

function warmRatesCache() {
  getExchangeRates().catch(() => {});
}

async function convertAmount(amount, fromCurrency = 'USD', toCurrency = 'USD') {
  const value = Number(amount || 0);
  const from = normalizeCurrency(fromCurrency);
  const to = normalizeCurrency(toCurrency);
  if (!Number.isFinite(value)) return 0;
  if (from === to) return roundMoney(value);
  const rates = await getExchangeRates();
  const fromRate = Number(rates[from]) || 1;
  const toRate = Number(rates[to]) || 1;
  return roundMoney((value / fromRate) * toRate);
}

function convertAmountSync(amount, fromCurrency = 'USD', toCurrency = 'USD') {
  const value = Number(amount || 0);
  const from = normalizeCurrency(fromCurrency);
  const to = normalizeCurrency(toCurrency);
  if (!Number.isFinite(value)) return 0;
  if (from === to) return roundMoney(value);
  const rates = exchangeRatesCache || FALLBACK_RATES;
  const fromRate = Number(rates[from]) || 1;
  const toRate = Number(rates[to]) || 1;
  return roundMoney((value / fromRate) * toRate);
}

async function convertToUSD(amount, fromCurrency = 'USD') {
  return convertAmount(amount, fromCurrency, 'USD');
}

async function convertFromUSD(amount, toCurrency = 'USD') {
  return convertAmount(amount, 'USD', toCurrency);
}

function convertToUSDSync(amount, fromCurrency = 'USD') {
  return convertAmountSync(amount, fromCurrency, 'USD');
}

function convertFromUSDSync(amount, toCurrency = 'USD') {
  return convertAmountSync(amount, 'USD', toCurrency);
}

async function formatMoney(amount, currency = 'USD', { decimals = 2, sourceCurrency = 'USD' } = {}) {
  const code = normalizeCurrency(currency);
  const convertedAmount = await convertAmount(amount, sourceCurrency, code);
  const symbol = CURRENCIES[code].symbol;
  return `${symbol}${convertedAmount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${code === 'USD' ? '' : ` ${code}`}`;
}

function formatMoneySync(amount, currency = 'USD', { decimals = 2, sourceCurrency = 'USD' } = {}) {
  const code = normalizeCurrency(currency);
  const convertedAmount = convertAmountSync(amount, sourceCurrency, code);
  const symbol = CURRENCIES[code].symbol;
  return `${symbol}${convertedAmount.toLocaleString('en-US', {
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
  convertAmount,
  convertAmountSync,
  convertToUSD,
  convertFromUSD,
  convertToUSDSync,
  convertFromUSDSync,
  formatMoney,
  formatMoneySync,
};
