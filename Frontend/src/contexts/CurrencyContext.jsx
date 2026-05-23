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
  EUR: { symbol: '€', name: 'Euro', code: 'EUR', position: 'before' },
  GBP: { symbol: '£', name: 'British Pound', code: 'GBP', position: 'before' }
};

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState('USD');
  const [exchangeRates, setExchangeRates] = useState({ USD: 1, PKR: 284.6, EUR: 0.92, GBP: 0.79 });
  const [isLoading, setIsLoading] = useState(true);

  // Detect currency on mount
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
            headers: { Authorization: `Bearer ${token}` }
          });
          const accountCurrency = userRes.data?.user?.currency;
          if (accountCurrency && CURRENCIES[accountCurrency] && (accountCurrency !== 'USD' || savedCurrency)) {
            console.log('Using account currency:', accountCurrency);
            setCurrency(accountCurrency);
            localStorage.setItem('userCurrency', accountCurrency);
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.warn('Could not load account currency, falling back to local preference/detection');
        }
      }

      // Check if user has saved preference in localStorage
      if (savedCurrency && CURRENCIES[savedCurrency]) {
        console.log('💰 Using saved currency:', savedCurrency);
        setCurrency(savedCurrency);
        setIsLoading(false);
        return;
      }

      // Auto-detect from IP
      const res = await axios.get(`${import.meta.env.VITE_API_URL}api/currency/detect`);
      if (res.data.success && res.data.detected) {
        console.log('🌍 Auto-detected currency:', res.data.currency, 'from', res.data.countryName);
        setCurrency(res.data.currency);
        localStorage.setItem('userCurrency', res.data.currency);
        const token = getAuthToken();
        if (token && CURRENCIES[res.data.currency]) {
          axios.patch(
            `${import.meta.env.VITE_API_URL}api/currency/update`,
            { currency: res.data.currency },
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
        console.log('💱 Exchange rates loaded:', res.data.rates);
        console.log('💱 PKR rate:', res.data.rates.PKR);
        setExchangeRates(res.data.rates);
      } else {
        console.warn('⚠️ Exchange rates API returned unsuccessful response');
      }
    } catch (error) {
      console.error('❌ Exchange rates fetch error:', error);
      console.log('Using fallback rates');
    }
  };

  const changeCurrency = async (newCurrency) => {
    if (!CURRENCIES[newCurrency]) return;
    
    console.log('💰 Changing currency to:', newCurrency);
    setCurrency(newCurrency);
    localStorage.setItem('userCurrency', newCurrency);

    // Update in database if user is logged in
    const token = getAuthToken();
    if (token) {
      try {
        await axios.patch(
          `${import.meta.env.VITE_API_URL}api/currency/update`,
          { currency: newCurrency },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('✅ Currency preference saved to account');
      } catch (error) {
        console.error('Failed to save currency preference:', error);
      }
    }
  };

  // Convert price from USD to selected currency
  const convertPrice = (priceInUSD) => {
    if (!priceInUSD) return 0;
    const rate = exchangeRates[currency] || 1;
    return priceInUSD * rate;
  };

  // Format price with currency symbol
  const formatPrice = (priceInUSD, options = {}) => {
    const { 
      showSymbol = true, 
      decimals = 2,
      showCode = false 
    } = options;

    const convertedPrice = convertPrice(priceInUSD);
    const currencyInfo = CURRENCIES[currency];
    
    const formattedNumber = convertedPrice.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });

    if (!showSymbol) return formattedNumber;

    const symbol = currencyInfo.symbol;
    const code = showCode ? ` ${currency}` : '';
    
    return `${symbol}${formattedNumber}${code}`;
  };

  // Convert price from selected currency back to USD (for API calls)
  const convertToUSD = (priceInCurrentCurrency) => {
    if (!priceInCurrentCurrency) return 0;
    const rate = exchangeRates[currency] || 1;
    return priceInCurrentCurrency / rate;
  };

  // Convert an amount from any source currency into the active display currency.
  // Used when a value is already known to be in a specific currency
  // (e.g. a product's `priceOriginal` in its `priceCurrency`).
  const convertFromCurrency = (amount, fromCurrency = 'USD') => {
    if (!amount) return 0;
    const from = CURRENCIES[fromCurrency] ? fromCurrency : 'USD';
    const fromRate = exchangeRates[from] || 1;
    const toRate = exchangeRates[currency] || 1;
    const inUSD = amount / fromRate;
    return inUSD * toRate;
  };

  // Returns the buyer-currency NUMBER for a product (no rounding drift).
  // Uses seller's `priceOriginal` + `priceCurrency` when available:
  //   - same currency  → verbatim
  //   - other currency → direct conversion (avoids USD double-conversion drift)
  // Falls back to USD-stored field converted to display currency.
  const getProductPriceNumber = (product, field = 'price') => {
    if (!product) return 0;
    const originalField = field === 'discountedPrice' ? 'discountedPriceOriginal' : 'priceOriginal';
    const productCurrency = product.priceCurrency && CURRENCIES[product.priceCurrency]
      ? product.priceCurrency
      : null;
    const originalValue = product[originalField];

    if (productCurrency && originalValue != null && originalValue !== '') {
      const num = Number(originalValue);
      if (Number.isFinite(num)) {
        return productCurrency === currency ? num : convertFromCurrency(num, productCurrency);
      }
    }
    const fallback = Number(product[field]);
    return Number.isFinite(fallback) ? convertPrice(fallback) : 0;
  };

  // Format an arbitrary amount that is ALREADY in the buyer's display currency
  // (no conversion). Use with values returned by getProductPriceNumber.
  const formatAmount = (amount, options = {}) => {
    const { showSymbol = true, decimals = 2, showCode = false } = options;
    const value = Number(amount) || 0;
    const formattedNumber = value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    if (!showSymbol) return formattedNumber;
    const symbol = CURRENCIES[currency].symbol;
    const code = showCode ? ` ${currency}` : '';
    return `${symbol}${formattedNumber}${code}`;
  };

  // Format a product's price (drift-free) using getProductPriceNumber.
  const formatProductPrice = (product, options = {}) => {
    const { field = 'price', ...rest } = options;
    return formatAmount(getProductPriceNumber(product, field), rest);
  };

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    currency,
    currencies: CURRENCIES,
    exchangeRates,
    isLoading,
    changeCurrency,
    convertPrice,
    formatPrice,
    formatProductPrice,
    getProductPriceNumber,
    formatAmount,
    convertToUSD,
    convertFromCurrency,
    getCurrencySymbol: () => CURRENCIES[currency].symbol,
    getCurrencyName: () => CURRENCIES[currency].name
  }), [currency, exchangeRates, isLoading]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};
