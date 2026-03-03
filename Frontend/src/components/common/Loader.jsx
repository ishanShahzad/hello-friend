import React from 'react';
import { motion } from 'framer-motion';

const Loader = ({ size = 'default', text = '' }) => {
  const sizes = {
    small: { container: 'w-12 h-12', orb: 'w-3 h-3', gap: 10 },
    default: { container: 'w-20 h-20', orb: 'w-4 h-4', gap: 14 },
    large: { container: 'w-28 h-28', orb: 'w-5 h-5', gap: 18 },
  };

  const s = sizes[size] || sizes.default;

  const orbColors = [
    'from-blue-400 to-indigo-500',
    'from-purple-400 to-pink-500',
    'from-cyan-400 to-blue-500',
    'from-indigo-400 to-purple-500',
  ];

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className={`${s.container} relative`}>
        {/* Glass backdrop */}
        <div className="absolute inset-0 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.4)]" />

        {/* Orbiting dots */}
        {orbColors.map((color, i) => (
          <motion.div
            key={i}
            className="absolute inset-0 flex items-center justify-center"
            animate={{ rotate: 360 }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: 'linear',
              delay: i * 0.15,
            }}
          >
            <motion.div
              className={`${s.orb} rounded-full bg-gradient-to-br ${color} shadow-lg`}
              style={{ transform: `translateY(-${s.gap}px)` }}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.3,
              }}
            />
          </motion.div>
        ))}

        {/* Center pulse */}
        <motion.div
          className="absolute inset-0 m-auto w-2.5 h-2.5 rounded-full bg-gradient-to-br from-white/80 to-white/40"
          animate={{
            scale: [0.8, 1.2, 0.8],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {text && (
        <motion.p
          className="text-sm font-medium text-[hsl(220,10%,50%)]"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
};

export default Loader;
