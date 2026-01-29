import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated, 
  Easing,
  Modal,
  Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, G, Text as SvgText, TSpan, Defs, RadialGradient, Stop } from 'react-native-svg';
import { colors, spacing, fontSize, borderRadius, shadows } from '../styles/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WHEEL_SIZE = Math.min(SCREEN_WIDTH * 0.75, 300);

/**
 * SpinWheel Component
 * Interactive spinning wheel for promotional discounts
 * 
 * @param {Object} props
 * @param {Function} props.onSpinComplete - Callback when spin completes with result
 * @param {Function} props.onClose - Callback to close the wheel
 * @param {boolean} props.visible - Whether the modal is visible
 */
const SpinWheel = ({ onSpinComplete, onClose, visible }) => {
  const segments = [
    { label: '40% OFF', color: '#ef4444', value: 40, type: 'percentage' },
    { label: 'All products FREE', color: '#10b981', value: 100, type: 'free' },
    { label: '60% OFF', color: '#3b82f6', value: 60, type: 'percentage' },
    { label: 'All products $0.99', color: '#eab308', value: 0.99, type: 'fixed' },
    { label: '80% OFF', color: '#a855f7', value: 80, type: 'percentage' },
    { label: '99% OFF', color: '#ec4899', value: 99, type: 'percentage' },
  ];

  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [showCongrats, setShowCongrats] = useState(false);
  const spinValue = useRef(new Animated.Value(0)).current;
  const currentRotation = useRef(0);

  // Target segments for winning: "All products FREE" (index 1) and "All products $0.99" (index 3)
  const targetSegments = [1, 3];

  const spin = () => {
    if (isSpinning) return;

    setIsSpinning(true);
    setResult(null);
    setShowCongrats(false);

    // Select random target segment
    const targetIndex = targetSegments[Math.floor(Math.random() * targetSegments.length)];
    const segmentAngle = 360 / segments.length;
    const targetAngle = targetIndex * segmentAngle + segmentAngle / 2;
    
    // Calculate rotation
    const fullRotations = (5 + Math.random()) * 360;
    const finalRotation = currentRotation.current + fullRotations + (360 - (currentRotation.current % 360)) + (360 - targetAngle);
    
    currentRotation.current = finalRotation;

    Animated.timing(spinValue, {
      toValue: finalRotation,
      duration: 5000,
      easing: Easing.bezier(0.17, 0.67, 0.12, 0.99),
      useNativeDriver: true,
    }).start(() => {
      setIsSpinning(false);
      const wonSegment = segments[targetIndex];
      setResult(wonSegment);
      setShowCongrats(true);

      if (onSpinComplete) {
        onSpinComplete(wonSegment);
      }
    });
  };

  const rotation = spinValue.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const renderWheel = () => {
    const segmentAngle = 360 / segments.length;
    
    return (
      <Svg width={WHEEL_SIZE} height={WHEEL_SIZE} viewBox="0 0 200 200">
        <Defs>
          <RadialGradient id="centerGradient">
            <Stop offset="0%" stopColor="#fbbf24" />
            <Stop offset="100%" stopColor="#f59e0b" />
          </RadialGradient>
        </Defs>
        
        {segments.map((segment, index) => {
          const angle = segmentAngle * index;
          const nextAngle = segmentAngle * (index + 1);

          const x1 = 100 + 100 * Math.cos(((angle - 90) * Math.PI) / 180);
          const y1 = 100 + 100 * Math.sin(((angle - 90) * Math.PI) / 180);
          const x2 = 100 + 100 * Math.cos(((nextAngle - 90) * Math.PI) / 180);
          const y2 = 100 + 100 * Math.sin(((nextAngle - 90) * Math.PI) / 180);

          const largeArc = nextAngle - angle > 180 ? 1 : 0;
          const pathData = `M 100 100 L ${x1} ${y1} A 100 100 0 ${largeArc} 1 ${x2} ${y2} Z`;

          const textAngle = angle + segmentAngle / 2;
          const textX = 100 + 60 * Math.cos(((textAngle - 90) * Math.PI) / 180);
          const textY = 100 + 60 * Math.sin(((textAngle - 90) * Math.PI) / 180);

          const words = segment.label.split(' ');

          return (
            <G key={index}>
              <Path d={pathData} fill={segment.color} stroke="white" strokeWidth="3" />
              <SvgText
                x={textX}
                y={textY}
                fill="white"
                fontSize="9"
                fontWeight="bold"
                textAnchor="middle"
                transform={`rotate(${textAngle}, ${textX}, ${textY})`}
              >
                {words.map((word, i) => (
                  <TSpan key={i} x={textX} dy={i === 0 ? 0 : 10}>
                    {word}
                  </TSpan>
                ))}
              </SvgText>
            </G>
          );
        })}
        
        {/* Center circle */}
        <Circle cx="100" cy="100" r="18" fill="url(#centerGradient)" stroke="white" strokeWidth="3" />
        <Circle cx="100" cy="100" r="7" fill="white" />
      </Svg>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="gift" size={32} color="#9333ea" />
            <Text style={styles.title}>SPIN & WIN!</Text>
            <Text style={styles.subtitle}>
              Get discounts up to <Text style={styles.highlight}>100% OFF!</Text>
            </Text>
          </View>

          {/* Wheel Container */}
          <View style={styles.wheelContainer}>
            {/* Pointer */}
            <View style={styles.pointer} />
            
            {/* Animated Wheel */}
            <Animated.View style={{ transform: [{ rotate: rotation }] }}>
              {renderWheel()}
            </Animated.View>
          </View>

          {/* Spin Button */}
          <TouchableOpacity
            style={[
              styles.spinButton,
              (isSpinning || showCongrats) && styles.spinButtonDisabled
            ]}
            onPress={spin}
            disabled={isSpinning || showCongrats}
          >
            <Ionicons 
              name={isSpinning ? 'sync' : showCongrats ? 'trophy' : 'flash'} 
              size={20} 
              color={colors.white} 
            />
            <Text style={styles.spinButtonText}>
              {isSpinning ? 'SPINNING...' : showCongrats ? 'PRIZE WON!' : 'SPIN NOW'}
            </Text>
          </TouchableOpacity>

          {/* Congratulations Section */}
          {showCongrats && result && (
            <View style={styles.congratsContainer}>
              <Ionicons name="trophy" size={40} color={colors.white} />
              <Text style={styles.congratsTitle}>🎊 CONGRATULATIONS! 🎊</Text>
              <Text style={styles.congratsResult}>{result.label}</Text>
              <View style={styles.congratsInfo}>
                <Text style={styles.congratsInfoTitle}>🎁 Your Exclusive Offer:</Text>
                <Text style={styles.congratsInfoText}>
                  Select up to <Text style={styles.bold}>3 products</Text> at this special price!
                </Text>
              </View>
              <TouchableOpacity style={styles.shopButton} onPress={onClose}>
                <Text style={styles.shopButtonText}>Start Shopping! 🛍️</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...shadows.lg,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.light,
    borderRadius: borderRadius.round,
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#9333ea',
    marginTop: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  highlight: {
    color: '#9333ea',
    fontWeight: 'bold',
  },
  wheelContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderTopWidth: 25,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#dc2626',
    marginBottom: -5,
    zIndex: 10,
  },
  spinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9333ea',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.round,
    gap: spacing.sm,
    ...shadows.md,
  },
  spinButtonDisabled: {
    opacity: 0.6,
  },
  spinButtonText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '900',
  },
  congratsContainer: {
    backgroundColor: '#f97316',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
    width: '100%',
  },
  congratsTitle: {
    fontSize: fontSize.xl,
    fontWeight: '900',
    color: colors.white,
    marginTop: spacing.sm,
  },
  congratsResult: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.white,
    marginVertical: spacing.md,
  },
  congratsInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    width: '100%',
    marginBottom: spacing.md,
  },
  congratsInfoTitle: {
    color: colors.white,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  congratsInfoText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: fontSize.sm,
  },
  bold: {
    fontWeight: 'bold',
  },
  shopButton: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.round,
  },
  shopButtonText: {
    color: '#9333ea',
    fontWeight: 'bold',
    fontSize: fontSize.md,
  },
});

export default SpinWheel;
