import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * VerifiedBadge Component
 * Displays a verification badge for verified stores
 * 
 * @param {Object} props
 * @param {'sm' | 'md' | 'lg'} props.size - Size variant of the badge
 * @param {Object} props.style - Additional styles to apply
 */
const VerifiedBadge = ({ size = 'md', style }) => {
  const sizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  const iconSize = sizes[size] || sizes.md;

  return (
    <View style={[styles.container, style]}>
      <Ionicons 
        name="checkmark-circle" 
        size={iconSize} 
        color="#007AFF"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default VerifiedBadge;
