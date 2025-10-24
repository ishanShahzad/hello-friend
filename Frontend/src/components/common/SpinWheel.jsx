import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Users, Clock, Trophy } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

export default function SpinWheel({ onSpinComplete, onClose }) {
  const segments = [
    { label: '40% OFF', color: '#ef4444', value: 40, type: 'percentage' },
    { label: 'All products FREE', color: '#10b981', value: 100, type: 'free' },
    { label: '60% OFF', color: '#3b82f6', value: 60, type: 'percentage' },
    { label: 'All products $0.99', color: '#eab308', value: 0.99, type: 'fixed' },
    { label: '80% OFF', color: '#a855f7', value: 80, type: 'percentage' },
    { label: '99% OFF', color: '#ec4899', value: 99, type: 'percentage' },
  ];

  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [showCongrats, setShowCongrats] = useState(false);

  const targetSegments = [1, 3]; // "All products FREE" and "All products $0.99"

  const spin = async () => {
    if (isSpinning) return;

    setIsSpinning(true);
    setResult(null);
    setShowCongrats(false);

    const targetIndex = targetSegments[Math.floor(Math.random() * targetSegments.length)];
    const segmentAngle = 360 / segments.length;
    const targetAngle = targetIndex * segmentAngle + segmentAngle / 2;
    const currentAngle = rotation % 360;
    const angleDifference = (targetAngle - currentAngle + 360) % 360;
    const fullRotations = (5 + Math.random()) * 360;
    const finalRotation = rotation + fullRotations + angleDifference;

    setRotation(finalRotation);

    setTimeout(async () => {
      setIsSpinning(false);
      const wonSegment = segments[targetIndex];
      setResult(wonSegment);
      setShowCongrats(true);

      // Notify parent component for immediate UI update
      if (onSpinComplete) {
        onSpinComplete(wonSegment);
      }
    }, 5000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 rounded-3xl shadow-2xl p-8 max-w-2xl w-full relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <h1 className="text-4xl font-bold text-center mb-2 text-white">🎉 Spin to Win! 🎉</h1>
        <p className="text-center text-white/80 mb-6">Try your luck and win amazing discounts!</p>

        <div className="relative flex flex-col items-center justify-center mb-8">
          {/* Pointer */}
          <div
            className="relative z-20 w-0 h-0 mb-2"
            style={{
              borderLeft: '20px solid transparent',
              borderRight: '20px solid transparent',
              borderTop: '40px solid #dc2626',
              filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))',
            }}
          ></div>

          {/* Wheel */}
          <div className="relative w-96 h-96 max-w-full">
            <div
              className="absolute inset-0 rounded-full shadow-2xl"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning
                  ? 'transform 5000ms cubic-bezier(0.17, 0.67, 0.12, 0.99)'
                  : 'none',
              }}
            >
              <svg viewBox="0 0 200 200" className="w-full h-full">
                {segments.map((segment, index) => {
                  const angle = (360 / segments.length) * index;
                  const nextAngle = (360 / segments.length) * (index + 1);

                  const x1 = 100 + 100 * Math.cos(((angle - 90) * Math.PI) / 180);
                  const y1 = 100 + 100 * Math.sin(((angle - 90) * Math.PI) / 180);
                  const x2 = 100 + 100 * Math.cos(((nextAngle - 90) * Math.PI) / 180);
                  const y2 = 100 + 100 * Math.sin(((nextAngle - 90) * Math.PI) / 180);

                  const largeArc = nextAngle - angle > 180 ? 1 : 0;
                  const pathData = `M 100 100 L ${x1} ${y1} A 100 100 0 ${largeArc} 1 ${x2} ${y2} Z`;

                  const textAngle = angle + (360 / segments.length) / 2;
                  const textX = 100 + 60 * Math.cos(((textAngle - 90) * Math.PI) / 180);
                  const textY = 100 + 60 * Math.sin(((textAngle - 90) * Math.PI) / 180);

                  return (
                    <g key={index}>
                      <path d={pathData} fill={segment.color} stroke="white" strokeWidth="3" />
                      <text
                        x={textX}
                        y={textY}
                        fill="white"
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="middle"
                        transform={`rotate(${textAngle}, ${textX}, ${textY})`}
                      >
                        {segment.label.split(' ').map((word, i) => (
                          <tspan key={i} x={textX} dy={i === 0 ? 0 : 10}>
                            {word}
                          </tspan>
                        ))}
                      </text>
                    </g>
                  );
                })}
                <circle cx="100" cy="100" r="15" fill="white" stroke="#374151" strokeWidth="3" />
              </svg>
            </div>
          </div>

          <motion.button
            onClick={spin}
            disabled={isSpinning || showCongrats}
            whileHover={!isSpinning && !showCongrats ? { scale: 1.05 } : {}}
            whileTap={!isSpinning && !showCongrats ? { scale: 0.95 } : {}}
            className="mt-6 px-12 py-4 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-xl shadow-xl hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSpinning ? 'SPINNING...' : showCongrats ? 'PRIZE WON!' : 'SPIN NOW'}
          </motion.button>
        </div>

        <AnimatePresence>
          {showCongrats && result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-8 p-6 bg-gradient-to-r from-green-400 to-blue-500 rounded-2xl text-center shadow-lg"
            >
              <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                <Trophy size={28} /> Congratulations! <Trophy size={28} />
              </h2>
              <p className="text-3xl font-extrabold text-white mb-3">{result.label}</p>
              <p className="text-white/90 text-sm">
                You can now select up to 3 products at this special price!
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {!result && !isSpinning && (
          <div className="mt-8 text-center text-white/80">
            <p className="text-lg font-medium flex items-center justify-center gap-2">
              <Gift size={20} /> Click SPIN to try your luck!
            </p>
          </div>
        )}

        {isSpinning && (
          <div className="mt-8 text-center text-white/80">
            <p className="text-lg font-medium animate-pulse flex items-center justify-center gap-2">
              <Clock size={20} className="animate-spin" /> Spinning... Good luck! 🍀
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
