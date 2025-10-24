import React from 'react';
import { motion } from 'framer-motion';
import { Users, Clock, Trophy, AlertCircle } from 'lucide-react';

export default function SpinBanner({ spinResult, selectedCount = 0 }) {
  if (!spinResult) return null;

  const getDiscountText = () => {
    if (spinResult.type === 'free') {
      return 'FREE';
    } else if (spinResult.type === 'fixed') {
      return `$${spinResult.value}`;
    } else {
      return `${spinResult.value}% OFF`;
    }
  };

  const getTimeRemaining = () => {
    const now = new Date();
    // Calculate expiration from timestamp (24 hours from spin)
    const spinTimestamp = localStorage.getItem('spinTimestamp');
    if (!spinTimestamp) return '0h 0m';
    
    const spinTime = parseInt(spinTimestamp);
    const expires = new Date(spinTime + (24 * 60 * 60 * 1000));
    const diff = expires - now;
    
    if (diff <= 0) return '0h 0m';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (spinResult.hasCheckedOut) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 rounded-xl shadow-lg mb-6"
      >
        <div className="flex items-center justify-center gap-3 flex-wrap text-center">
          <Trophy size={24} />
          <div>
            <p className="font-bold text-lg">You're in the Winner's List!</p>
            <p className="text-sm text-white/90">
              {spinResult.isWinner !== null
                ? spinResult.isWinner
                  ? '🎉 Congratulations! You won! Check your orders.'
                  : 'Better luck next time! Try again tomorrow.'
                : 'Results will be announced soon. Come back tomorrow!'}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 rounded-xl shadow-lg mb-6"
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Trophy size={32} className="flex-shrink-0" />
          <div>
            <p className="font-bold text-lg">
              🎉 You Won: {getDiscountText()}
            </p>
            <p className="text-sm text-white/90">
              Select up to 3 products at this special price!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Users size={18} />
            <span>{selectedCount}/3 Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={18} />
            <span>{getTimeRemaining()} left</span>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-3 p-3 bg-white/20 rounded-lg backdrop-blur-sm"
      >
        <div className="flex items-start gap-2 text-sm">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <p>
            <strong>Note:</strong> Many people are shopping now! Only 1-2 winners will actually get these products at the discounted price. Complete your checkout to enter the draw!
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
