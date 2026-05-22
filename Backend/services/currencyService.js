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
  convertToUSD,
  convertFromUSD,
  convertFromUSDSync,
  formatMoney,
  formatMoneySync,
};
