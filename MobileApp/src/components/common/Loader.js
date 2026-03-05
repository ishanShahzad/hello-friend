/**
 * Orbiting Dots Loader — matches web Loader design
 * Glass backdrop with 4 orbiting gradient dots and a center pulse
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { colors, spacing } from '../../styles/theme';

const SIZES = {
  small: { container: 48, orb: 10, gap: 10 },
  medium: { container: 80, orb: 14, gap: 14 },
  large: { container: 112, orb: 18, gap: 18 },
};

const ORB_COLORS = [
  ['#60a5fa', '#6366f1'], // blue → indigo
  ['#c084fc', '#ec4899'], // purple → pink
  ['#22d3ee', '#3b82f6'], // cyan → blue
  ['#818cf8', '#a855f7'], // indigo → purple
];

const Loader = ({ size = 'medium', text = '', style }) => {
  const s = SIZES[size] || SIZES.medium;

  // One rotation value per orb
  const rotations = useRef(ORB_COLORS.map(() => new Animated.Value(0))).current;
  // Scale pulse per orb
  const scales = useRef(ORB_COLORS.map(() => new Animated.Value(1))).current;
  // Center pulse
  const centerScale = useRef(new Animated.Value(0.8)).current;
  const centerOpacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Orbit animations
    const orbitAnims = rotations.map((val, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(val, {
            toValue: 1,
            duration: 2400,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ])
      )
    );

    // Scale pulse animations
    const scaleAnims = scales.map((val, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 300),
          Animated.timing(val, { toValue: 1.3, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(val, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      )
    );

    // Center pulse
    const centerAnim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(centerScale, { toValue: 1.2, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(centerOpacity, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(centerScale, { toValue: 0.8, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(centerOpacity, { toValue: 0.5, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      ])
    );

    [...orbitAnims, ...scaleAnims, centerAnim].forEach(a => a.start());
    return () => [...orbitAnims, ...scaleAnims, centerAnim].forEach(a => a.stop());
  }, []);

  return (
    <View style={[styles.wrapper, style]}>
      <View style={[styles.container, { width: s.container, height: s.container }]}>
        {/* Glass backdrop circle */}
        <View style={[styles.backdrop, { width: s.container, height: s.container, borderRadius: s.container / 2 }]} />

        {/* Orbiting dots */}
        {ORB_COLORS.map((colorPair, i) => {
          const rotate = rotations[i].interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '360deg'],
          });
          return (
            <Animated.View
              key={i}
              style={[
                styles.orbitWrap,
                { width: s.container, height: s.container, transform: [{ rotate }] },
              ]}
            >
              <Animated.View
                style={[
                  styles.orb,
                  {
                    width: s.orb,
                    height: s.orb,
                    borderRadius: s.orb / 2,
                    backgroundColor: colorPair[0],
                    transform: [{ translateY: -s.gap }, { scale: scales[i] }],
                    shadowColor: colorPair[1],
                  },
                ]}
              />
            </Animated.View>
          );
        })}

        {/* Center pulse */}
        <Animated.View
          style={[
            styles.center,
            {
              width: 10,
              height: 10,
              borderRadius: 5,
              opacity: centerOpacity,
              transform: [{ scale: centerScale }],
            },
          ]}
        />
      </View>

      {text ? (
        <Animated.Text style={styles.text}>{text}</Animated.Text>
      ) : null}
    </View>
  );
};

// Simple inline loader for buttons
export const InlineLoader = ({ size = 20, color = colors.white }) => {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: color, borderTopColor: 'transparent', transform: [{ rotate }] }} />
  );
};

// Loading overlay for screens
export const LoadingOverlay = ({ visible, message }) => {
  if (!visible) return null;
  return (
    <View style={styles.overlayContainer}>
      <View style={styles.overlayContent}>
        <Loader size="medium" />
        {message && <Text style={styles.overlayText}>{message}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  orbitWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orb: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  center: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
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
  overlayText: {
    marginTop: spacing.lg,
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default Loader;
