/**
 * GlassPanel Component — Liquid Glass Design (theme-aware)
 * Pulls glass surface colors from the active theme palette so dark mode swaps cleanly.
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { borderRadius as br, shadows, spacing } from '../../styles/theme';
import { useTheme } from '../../contexts/ThemeContext';

const buildVariants = (palette) => {
  const g = palette.glass;
  return {
    default: { bg: g.bg, border: g.border, blur: g.blur },
    card:    { bg: g.bg, border: g.border, blur: g.blur },
    strong:  { bg: g.bgStrong, border: g.borderStrong, blur: g.blurStrong },
    floating:{ bg: g.bgStrong, border: g.borderStrong, blur: g.blurStrong },
    inner:   { bg: g.bgSubtle, border: g.borderSubtle, blur: 30 },
  };
};

export default function GlassPanel({ children, style, variant = 'default' }) {
  const { palette, isDark } = useTheme();
  const VARIANTS = buildVariants(palette);
  const v = VARIANTS[variant] || VARIANTS.default;
  const tint = isDark ? 'dark' : 'light';

  if (Platform.OS === 'ios') {
    return (
      <View
        style={[
          styles.panel,
          { backgroundColor: v.bg, borderColor: v.border },
          style,
        ]}
      >
        <BlurView intensity={v.blur} tint={tint} style={StyleSheet.absoluteFill} />
        {children}
      </View>
    );
  }

  // Android — no native blur; rely on opaque glass color
  const isInner = variant === 'inner';
  return (
    <View
      style={[
        styles.panel,
        isInner ? styles.androidInnerPanel : styles.androidPanel,
        { backgroundColor: v.bg, borderColor: v.border, borderWidth: isInner ? 0 : 1 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: br.xl,
    borderWidth: 1,
    padding: spacing.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  androidPanel: {
    elevation: 2,
    shadowColor: 'rgba(0, 0, 0, 0.08)',
  },
  androidInnerPanel: {
    elevation: 0,
    shadowOpacity: 0,
  },
});
