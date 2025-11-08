import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, ChevronDown } from 'lucide-react';
import { useCurrency } from '../../contexts/CurrencyContext';

export default function CurrencySelector() {
  const { currency, currencies, changeCurrency } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);

  const handleCurrencyChange = (newCurrency) => {
    changeCurrency(newCurrency);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
      >
        <DollarSign size={18} className="text-gray-600" />
        <span className="font-medium text-gray-800">{currency}</span>
        <ChevronDown size={16} className={`text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden"
            >
              <div className="p-2">
                <p className="text-xs text-gray-500 px-3 py-2 font-medium">Select Currency</p>
                {Object.entries(currencies).map(([code, info]) => (
                  <motion.button
                    key={code}
                    onClick={() => handleCurrencyChange(code)}
                    whileHover={{ backgroundColor: '#f3f4f6' }}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      currency === code ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{info.symbol}</span>
                        <div>
                          <p className="font-medium text-sm">{code}</p>
                          <p className="text-xs text-gray-500">{info.name}</p>
                        </div>
                      </div>
                      {currency === code && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full" />
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
