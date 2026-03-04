/**
 * GlassPanel Component — Liquid Glass Design
 * Translucent, refractive card with blur and border effects
 * Matches the web platform's .glass-panel / .glass-card aesthetic
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { borderRadius as br, shadows } from '../../styles/theme';

const VARIANTS = {
  default: {
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.72)',
    borderColor: 'rgba(255,255,255,0.5)',
    blurIntensity: 40,
  },
  card: {
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.78)',
    borderColor: 'rgba(255,255,255,0.55)',
    blurIntensity: 50,
  },
  strong: {
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.85)',
    borderColor: 'rgba(255,255,255,0.65)',
    blurIntensity: 60,
  },
  floating: {
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.82)',
    borderColor: 'rgba(255,255,255,0.6)',
    blurIntensity: 55,
  },
  inner: {
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.6)',
    borderColor: 'rgba(255,255,255,0.4)',
    blurIntensity: 30,
  },
};

export default function GlassPanel({ children, style, variant = 'default' }) {
  const v = VARIANTS[variant] || VARIANTS.default;

  if (Platform.OS === 'ios') {
    return (
      <View style={[styles.wrapper, style]}>
        <BlurView intensity={v.blurIntensity} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[styles.overlay, { backgroundColor: v.backgroundColor, borderColor: v.borderColor }]}>
          {children}
        </View>
      </View>
    );
  }

  // Android fallback — no BlurView, use higher opacity background
  return (
    <View style={[styles.androidPanel, { backgroundColor: v.backgroundColor, borderColor: v.borderColor }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: br.xl,
    overflow: 'hidden',
    ...shadows.md,
  },
  overlay: {
    borderWidth: 1,
    borderRadius: br.xl,
    padding: 0, // let consumers control padding
  },
  androidPanel: {
    borderRadius: br.xl,
    borderWidth: 1,
    ...shadows.md,
  },
});
