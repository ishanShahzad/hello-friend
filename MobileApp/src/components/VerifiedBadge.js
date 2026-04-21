/**
 * VerifiedBadge — Liquid Glass Design (themed)
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const VerifiedBadge = ({ size = 'md', style }) => {
  const { palette } = useTheme();
  const sizes = { xs: 14, sm: 16, md: 20, lg: 24 };
  const iconSize = sizes[size] || sizes.md;

  return (
    <View style={[styles.container, style]}>
      <Ionicons name="checkmark-circle" size={iconSize} color={palette.colors.verified || palette.colors.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center' },
});

export default VerifiedBadge;
