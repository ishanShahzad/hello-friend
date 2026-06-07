import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { getAuthToken } from "../utils/cookieHelper";

const CurrencyContext = createContext();

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
};

const CURRENCIES = {
  USD: { symbol: '$', name: 'US Dollar', code: 'USD', position: 'before' },
  PKR: { symbol: 'Rs', name: 'Pakistani Rupee', code: 'PKR', position: 'before' },
  EUR: { symbol: 'EUR', name: 'Euro', code: 'EUR', position: 'before' },
  GBP: { symbol: 'GBP', name: 'British Pound', code: 'GBP', position: 'before' },
};

const normalizeCurrency = (code) => {
  const normalized = String(code || 'USD').trim().toUpperCase();
  return CURRENCIES[normalized] ? normalized : 'USD';
};

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState('USD');
  const [exchangeRates, setExchangeRates] = useState({ USD: 1, PKR: 284.6, EUR: 0.92, GBP: 0.79 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    detectAndSetCurrency();
    fetchExchangeRates();
  }, []);

  const detectAndSetCurrency = async () => {
    try {
      const savedCurrency = localStorage.getItem('userCurrency');
      const token = getAuthToken();
      if (token) {
        try {
          const userRes = await axios.get(`${import.meta.env.VITE_API_URL}api/user/single`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const accountCurrency = userRes.data?.user?.currency;
          if (accountCurrency && CURRENCIES[accountCurrency] && (accountCurrency !== 'USD' || savedCurrency)) {
            setCurrency(accountCurrency);
            localStorage.setItem('userCurrency', accountCurrency);
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.warn('Could not load account currency, falling back to local preference/detection');
        }
      }

      if (savedCurrency && CURRENCIES[savedCurrency]) {
        setCurrency(savedCurrency);
        setIsLoading(false);
        return;
      }

      const res = await axios.get(`${import.meta.env.VITE_API_URL}api/currency/detect`);
      if (res.data.success && res.data.detected) {
        const detectedCurrency = normalizeCurrency(res.data.currency);
        setCurrency(detectedCurrency);
        localStorage.setItem('userCurrency', detectedCurrency);
        const token = getAuthToken();
        if (token && CURRENCIES[detectedCurrency]) {
          axios.patch(
            `${import.meta.env.VITE_API_URL}api/currency/update`,
            { currency: detectedCurrency },
            { headers: { Authorization: `Bearer ${token}` } }
          ).catch(() => {});
        }
      }
    } catch (error) {
      console.error('Currency detection error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExchangeRates = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}api/currency/rates`);
      if (res.data.success) {
        setExchangeRates(res.data.rates);
      } else {
        console.warn('Exchange rates API returned unsuccessful response');
      }
    } catch (error) {
      console.error('Exchange rates fetch error:', error);
    }
  };

  const changeCurrency = async (newCurrency) => {
    const targetCurrency = normalizeCurrency(newCurrency);
    if (!CURRENCIES[targetCurrency]) return;

    setCurrency(targetCurrency);
    localStorage.setItem('userCurrency', targetCurrency);

    const token = getAuthToken();
    if (token) {
      try {
        await axios.patch(
          `${import.meta.env.VITE_API_URL}api/currency/update`,
          { currency: targetCurrency },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (error) {
        console.error('Failed to save currency preference:', error);
      }
    }
  };

  const roundMoney = (amount) => Math.round((Number(amount) || 0) * 100) / 100;

  const convertAmount = (amount, sourceCurrency = 'USD', targetCurrency = currency) => {
    const value = Number(amount || 0);
    if (!Number.isFinite(value)) return 0;
    const from = normalizeCurrency(sourceCurrency);
    const to = normalizeCurrency(targetCurrency);
    if (from === to) return roundMoney(value);
    const fromRate = Number(exchangeRates[from]) || 1;
    const toRate = Number(exchangeRates[to]) || 1;
    return roundMoney((value / fromRate) * toRate);
  };

  const convertPrice = (price, sourceCurrency = 'USD') => {
    return convertAmount(price, sourceCurrency, currency);
  };

  const formatPrice = (price, options = {}) => {
    const {
      showSymbol = true,
      decimals = 2,
      showCode = false,
      sourceCurrency = 'USD',
      targetCurrency = currency,
    } = options;

    const target = normalizeCurrency(targetCurrency);
    const convertedPrice = convertAmount(price, sourceCurrency, target);
    const currencyInfo = CURRENCIES[target];

    const formattedNumber = convertedPrice.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    if (!showSymbol) return formattedNumber;

    const code = showCode ? ` ${target}` : '';
    return `${currencyInfo.symbol}${formattedNumber}${code}`;
  };

  const convertToUSD = (priceInCurrentCurrency) => {
    return convertAmount(priceInCurrentCurrency, currency, 'USD');
  };

  const convertFromCurrency = (amount, fromCurrency = 'USD') => {
    return convertAmount(amount, fromCurrency, currency);
  };

  const formatAmount = (amount, options = {}) => {
    const { showSymbol = true, decimals = 2, showCode = false } = options;
    const value = Number(amount || 0);
    const formattedNumber = value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    if (!showSymbol) return formattedNumber;
    const code = showCode ? ` ${currency}` : '';
    return `${CURRENCIES[currency].symbol}${formattedNumber}${code}`;
  };

  const getProductCurrency = (product) => normalizeCurrency(product?.currency || product?.priceCurrency || 'USD');

  const getProductPriceNumber = (product, field = 'price') => {
    if (!product) return 0;
    const rawValue = Number(product[field]);
    if (Number.isFinite(rawValue)) return convertAmount(rawValue, getProductCurrency(product), currency);

    const legacyField = field === 'discountedPrice' ? 'discountedPriceOriginal' : 'priceOriginal';
    const legacyValue = Number(product[legacyField]);
    return Number.isFinite(legacyValue)
      ? convertAmount(legacyValue, getProductCurrency(product), currency)
      : 0;
  };

  const formatProductPrice = (product, amountOrOptions = undefined, maybeOptions = {}) => {
    const hasExplicitAmount = typeof amountOrOptions === 'number' || typeof amountOrOptions === 'string';
    const options = hasExplicitAmount ? maybeOptions : (amountOrOptions || {});
    const field = options.field || 'price';
    const amount = hasExplicitAmount ? amountOrOptions : undefined;
    const value = amount === undefined
      ? getProductPriceNumber(product, field)
      : amount;
    return amount === undefined
      ? formatAmount(value, options)
      : formatPrice(value, { ...options, sourceCurrency: getProductCurrency(product) });
  };

  const getOrderItemCurrency = (item, orderCurrency = 'USD') =>
    normalizeCurrency(item?.currency || item?.orderCurrency || orderCurrency);

  const getOrderItemPriceNumber = (item, orderCurrency = 'USD') => {
    if (!item) return 0;
    const amount = Number(item.price);
    if (Number.isFinite(amount)) return convertAmount(amount, getOrderItemCurrency(item, orderCurrency), currency);
    const sourceAmount = Number(item.sourcePrice ?? item.priceOriginal);
    const sourceCurrency = item.sourceCurrency || item.priceCurrency || orderCurrency;
    return Number.isFinite(sourceAmount) ? convertAmount(sourceAmount, sourceCurrency, currency) : 0;
  };

  const formatOrderItemPrice = (item, options = {}) =>
    formatAmount(getOrderItemPriceNumber(item, options.orderCurrency), options);

  const value = useMemo(() => ({
    currency,
    currencies: CURRENCIES,
    exchangeRates,
    isLoading,
    changeCurrency,
    normalizeCurrency,
    convertAmount,
    convertPrice,
    formatPrice,
    formatProductPrice,
    getProductPriceNumber,
    formatAmount,
    convertFromCurrency,
    getOrderItemPriceNumber,
    formatOrderItemPrice,
    getProductCurrency,
    convertToUSD,
    getCurrencySymbol: () => CURRENCIES[currency].symbol,
    getCurrencyName: () => CURRENCIES[currency].name,
  }), [currency, exchangeRates, isLoading]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};
