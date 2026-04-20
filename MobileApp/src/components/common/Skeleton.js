/**
 * Skeleton — shimmering placeholder for loading states.
 * Lightweight, uses native driver for smooth 60fps animation.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { borderRadius, spacing, glass, colors } from '../../styles/theme';

export function Skeleton({ width, height = 16, radius = 8, style }) {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: 'rgba(99,102,241,0.10)', opacity },
        style,
      ]}
    />
  );
}

export function ProductCardSkeleton({ width: cardWidth }) {
  return (
    <View style={[skeletonStyles.card, cardWidth ? { width: cardWidth } : null]}>
      <Skeleton width="100%" height={140} radius={16} />
      <View style={{ padding: 12, gap: 8 }}>
        <Skeleton width="40%" height={9} radius={4} />
        <Skeleton width="90%" height={14} radius={6} />
        <Skeleton width="60%" height={14} radius={6} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <Skeleton width={60} height={18} radius={6} />
          <Skeleton width={70} height={28} radius={14} />
        </View>
      </View>
    </View>
  );
}

export function ProductGridSkeleton({ count = 6 }) {
  return (
    <View style={skeletonStyles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </View>
  );
}

export function CartItemSkeleton() {
  return (
    <View style={skeletonStyles.cartRow}>
      <Skeleton width={90} height={90} radius={12} />
      <View style={{ flex: 1, marginLeft: 12, gap: 8 }}>
        <Skeleton width="40%" height={10} radius={4} />
        <Skeleton width="85%" height={14} radius={6} />
        <Skeleton width="50%" height={18} radius={6} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <Skeleton width={100} height={32} radius={16} />
          <Skeleton width={36} height={36} radius={18} />
        </View>
      </View>
    </View>
  );
}

export function SliderSkeleton({ count = 4 }) {
  return (
    <View style={skeletonStyles.sliderRow}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={skeletonStyles.sliderCard}>
          <Skeleton width="100%" height={130} radius={14} />
          <View style={{ padding: 8, gap: 6 }}>
            <Skeleton width="80%" height={12} radius={4} />
            <Skeleton width="50%" height={14} radius={6} />
          </View>
        </View>
      ))}
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: glass.bg || 'rgba(255,255,255,0.55)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: glass.border || 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
    margin: 4,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.sm },
  cartRow: {
    flexDirection: 'row',
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: glass.bg || 'rgba(255,255,255,0.55)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: glass.border || 'rgba(255,255,255,0.5)',
    marginHorizontal: spacing.md,
  },
  sliderRow: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.sm },
  sliderCard: {
    width: 160,
    backgroundColor: glass.bg || 'rgba(255,255,255,0.55)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: glass.border || 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
  },
});

export default Skeleton;
