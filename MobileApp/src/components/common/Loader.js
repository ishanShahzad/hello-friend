/**
 * Animated Multi-Ring Loader Component
 * Matches the website's loader design with four animated rings
 * 
 * Requirements: 2.1, 2.2, 2.5
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, loaderColors, spacing } from '../../styles/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZES = {
  small: { size: 40, strokeWidth: 4 },
  medium: { size: 80, strokeWidth: 8 },
  large: { size: 120, strokeWidth: 12 },
};

const Loader = ({ 
  size = 'medium', 
  color, 
  fullScreen = false,
  style,
}) => {
  const { size: loaderSize, strokeWidth } = SIZES[size] || SIZES.medium;
  const viewBox = 240;
  const scale = loaderSize / viewBox;

  // Animation values for each ring
  const ringAProgress = useRef(new Animated.Value(0)).current;
  const ringBProgress = useRef(new Animated.Value(0)).current;
  const ringCProgress = useRef(new Animated.Value(0)).current;
  const ringDProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const duration = 2000;

    const createAnimation = (animatedValue, delay = 0) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ])
      );
    };

    // Start all animations with slight delays for staggered effect
    const animations = [
      createAnimation(ringAProgress, 0),
      createAnimation(ringBProgress, 100),
      createAnimation(ringCProgress, 200),
      createAnimation(ringDProgress, 300),
    ];

    animations.forEach(anim => anim.start());

    return () => {
      animations.forEach(anim => anim.stop());
    };
  }, []);

  // Interpolate rotation for each ring
  const ringARotation = ringAProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const ringBRotation = ringBProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  const ringCRotation = ringCProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const ringDRotation = ringDProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  const renderLoader = () => (
    <View style={[styles.loaderContainer, { width: loaderSize, height: loaderSize }, style]}>
      {/* Ring A - Outer ring (Red) */}
      <Animated.View 
        style={[
          styles.ringContainer, 
          { transform: [{ rotate: ringARotation }] }
        ]}
      >
        <Svg width={loaderSize} height={loaderSize} viewBox={`0 0 ${viewBox} ${viewBox}`}>
          <Circle
            cx="120"
            cy="120"
            r="105"
            stroke={color || loaderColors.ringA}
            strokeWidth={strokeWidth / scale}
            fill="none"
            strokeLinecap="round"
            strokeDasharray="60 600"
            strokeDashoffset="-330"
          />
        </Svg>
      </Animated.View>

      {/* Ring B - Inner ring (Yellow) */}
      <Animated.View 
        style={[
          styles.ringContainer, 
          styles.absoluteRing,
          { transform: [{ rotate: ringBRotation }] }
        ]}
      >
        <Svg width={loaderSize} height={loaderSize} viewBox={`0 0 ${viewBox} ${viewBox}`}>
          <Circle
            cx="120"
            cy="120"
            r="35"
            stroke={color || loaderColors.ringB}
            strokeWidth={strokeWidth / scale}
            fill="none"
            strokeLinecap="round"
            strokeDasharray="20 200"
            strokeDashoffset="-110"
          />
        </Svg>
      </Animated.View>

      {/* Ring C - Left ring (Blue) */}
      <Animated.View 
        style={[
          styles.ringContainer, 
          styles.absoluteRing,
          { transform: [{ rotate: ringCRotation }] }
        ]}
      >
        <Svg width={loaderSize} height={loaderSize} viewBox={`0 0 ${viewBox} ${viewBox}`}>
          <Circle
            cx="85"
            cy="120"
            r="70"
            stroke={color || loaderColors.ringC}
            strokeWidth={strokeWidth / scale}
            fill="none"
            strokeLinecap="round"
            strokeDasharray="40 400"
            strokeDashoffset="0"
          />
        </Svg>
      </Animated.View>

      {/* Ring D - Right ring (Green) */}
      <Animated.View 
        style={[
          styles.ringContainer, 
          styles.absoluteRing,
          { transform: [{ rotate: ringDRotation }] }
        ]}
      >
        <Svg width={loaderSize} height={loaderSize} viewBox={`0 0 ${viewBox} ${viewBox}`}>
          <Circle
            cx="155"
            cy="120"
            r="70"
            stroke={color || loaderColors.ringD}
            strokeWidth={strokeWidth / scale}
            fill="none"
            strokeLinecap="round"
            strokeDasharray="40 400"
            strokeDashoffset="0"
          />
        </Svg>
      </Animated.View>
    </View>
  );

  if (fullScreen) {
    return (
      <View style={styles.fullScreenContainer}>
        <View style={styles.backdrop} />
        {renderLoader()}
      </View>
    );
  }

  return renderLoader();
};

// Simple inline loader for buttons and small spaces
export const InlineLoader = ({ size = 20, color = colors.white }) => (
  <View style={[styles.inlineLoader, { width: size, height: size }]}>
    <Animated.View style={styles.inlineSpinner}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle
          cx="12"
          cy="12"
          r="10"
          stroke={color}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="31.4 31.4"
          strokeDashoffset="0"
        />
      </Svg>
    </Animated.View>
  </View>
);

// Loading overlay for screens
export const LoadingOverlay = ({ visible, message }) => {
  if (!visible) return null;
  
  return (
    <View style={styles.overlayContainer}>
      <View style={styles.overlayContent}>
        <Loader size="medium" />
        {message && (
          <View style={styles.messageContainer}>
            <Animated.Text style={styles.messageText}>{message}</Animated.Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loaderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringContainer: {
    position: 'absolute',
  },
  absoluteRing: {
    position: 'absolute',
  },
  fullScreenContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  inlineLoader: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineSpinner: {
    // Animation handled by parent
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlayContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.xxl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  messageContainer: {
    marginTop: spacing.lg,
  },
  messageText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default Loader;
