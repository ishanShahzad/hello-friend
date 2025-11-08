import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

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
      // Check if user has saved preference in localStorage
      const savedCurrency = localStorage.getItem('userCurrency');
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
    const token = localStorage.getItem('jwtToken');
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

  const value = {
    currency,
    currencies: CURRENCIES,
    exchangeRates,
    isLoading,
    changeCurrency,
    convertPrice,
    formatPrice,
    convertToUSD,
    getCurrencySymbol: () => CURRENCIES[currency].symbol,
    getCurrencyName: () => CURRENCIES[currency].name
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};
