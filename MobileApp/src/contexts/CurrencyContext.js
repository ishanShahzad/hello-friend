import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

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
  const [exchangeRates, setExchangeRates] = useState({ 
    USD: 1, 
    PKR: 284.6, 
    EUR: 0.92, 
    GBP: 0.79 
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    detectAndSetCurrency();
    fetchExchangeRates();
  }, []);

  const detectAndSetCurrency = async () => {
    try {
      const savedCurrency = await AsyncStorage.getItem('userCurrency');
      if (savedCurrency && CURRENCIES[savedCurrency]) {
        console.log('💰 Using saved currency:', savedCurrency);
        setCurrency(savedCurrency);
        setIsLoading(false);
        return;
      }

      const res = await axios.get(`${API_BASE_URL}/api/currency/detect`);
      if (res.data.success && res.data.detected) {
        console.log('🌍 Auto-detected currency:', res.data.currency);
        setCurrency(res.data.currency);
        await AsyncStorage.setItem('userCurrency', res.data.currency);
      }
    } catch (error) {
      console.error('Currency detection error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExchangeRates = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/currency/rates`);
      if (res.data.success) {
        console.log('💱 Exchange rates loaded');
        setExchangeRates(res.data.rates);
      }
    } catch (error) {
      console.error('Exchange rates fetch error:', error);
    }
  };

  const changeCurrency = async (newCurrency) => {
    if (!CURRENCIES[newCurrency]) return;
    
    console.log('💰 Changing currency to:', newCurrency);
    setCurrency(newCurrency);
    await AsyncStorage.setItem('userCurrency', newCurrency);

    const token = await AsyncStorage.getItem('jwtToken');
    if (token) {
      try {
        await axios.patch(
          `${API_BASE_URL}/api/currency/update`,
          { currency: newCurrency },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('✅ Currency preference saved');
      } catch (error) {
        console.error('Failed to save currency preference:', error);
      }
    }
  };

  const convertPrice = (priceInUSD) => {
    if (!priceInUSD) return 0;
    const rate = exchangeRates[currency] || 1;
    return priceInUSD * rate;
  };

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
