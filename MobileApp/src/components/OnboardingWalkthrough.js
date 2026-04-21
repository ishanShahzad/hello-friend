/**
 * OnboardingWalkthrough — First-time user walkthrough
 * Shows key app features with swipeable pages and skip/done actions.
 */

import React, { useState, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Dimensions, Animated, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { spacing, fontSize, fontWeight, borderRadius, shadows } from '../styles/theme';
import { useTheme } from '../contexts/ThemeContext';

const { width, height } = Dimensions.get('window');

const ONBOARDING_KEY = 'onboarding_completed';

const slides = [
  {
    id: '1',
    icon: 'storefront',
    iconColor: '#6366f1',
    bgGradient: ['#eef2ff', '#e0e7ff'],
    title: 'Discover Stores',
    subtitle: 'Browse trusted stores from verified sellers. Find unique products across categories.',
    features: ['Verified seller badges', 'Store trust ratings', 'Category filters'],
  },
  {
    id: '2',
    icon: 'cart',
    iconColor: '#10b981',
    bgGradient: ['#ecfdf5', '#d1fae5'],
    title: 'Easy Shopping',
    subtitle: 'Add to cart, apply coupons, and checkout seamlessly — even as a guest.',
    features: ['Guest checkout', 'Multiple payment methods', 'Coupon discounts'],
  },
  {
    id: '3',
    icon: 'location',
    iconColor: '#f59e0b',
    bgGradient: ['#fffbeb', '#fef3c7'],
    title: 'Track Orders',
    subtitle: 'Real-time order tracking from confirmation to delivery, right in the app.',
    features: ['Live status updates', 'Shipping details', 'Order history'],
  },
  {
    id: '4',
    icon: 'rocket',
    iconColor: '#8b5cf6',
    bgGradient: ['#f5f3ff', '#ede9fe'],
    title: 'Sell Your Products',
    subtitle: 'Become a seller, set up your store, manage inventory, and grow your business.',
    features: ['Store analytics', 'Subscription plans', 'Coupon management'],
  },
  {
    id: '5',
    icon: 'notifications',
    iconColor: '#3b82f6',
    bgGradient: ['#eff6ff', '#dbeafe'],
    title: 'Stay Updated',
    subtitle: 'Get instant push notifications for orders, deals, and stock alerts.',
    features: ['Order notifications', 'Price drop alerts', 'Wishlist updates'],
  },
];

export async function shouldShowOnboarding() {
  try {
    const val = await SecureStore.getItemAsync(ONBOARDING_KEY);
    return val !== 'true';
  } catch {
    return true;
  }
}

export async function markOnboardingComplete() {
  try {
    await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
  } catch {}
}

export default function OnboardingWalkthrough({ onComplete }) {
  const { palette } = useTheme();
  const colors = palette.colors;
  const styles = makeStyles(palette);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      handleDone();
    }
  };

  const handleSkip = () => {
    handleDone();
  };

  const handleDone = async () => {
    await markOnboardingComplete();
    onComplete();
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const renderSlide = ({ item, index }) => {
    const dotColor = colors.primary;
    return (
    <View style={[styles.slide, { width }]}>
      <LinearGradient colors={item.bgGradient} style={styles.slideGradient}>
        {/* Icon */}
        <View style={[styles.iconCircle, { backgroundColor: item.iconColor + '20' }]}>
          <Ionicons name={item.icon} size={64} color={item.iconColor} />
        </View>

        {/* Content */}
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>

        {/* Features */}
        <View style={styles.featuresContainer}>
          {item.features.map((feature, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={[styles.featureDot, { backgroundColor: item.iconColor }]} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>
    </View>
    );
  };

  const isLast = currentIndex === slides.length - 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Skip button */}
      <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
        <Text style={styles.skipText}>{isLast ? '' : 'Skip'}</Text>
      </TouchableOpacity>

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
      />

      {/* Bottom controls */}
      <View style={styles.bottomContainer}>
        {/* Pagination dots */}
        <View style={styles.pagination}>
          {slides.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });
            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { width: dotWidth, opacity: dotOpacity, backgroundColor: colors.primary }]}
              />
            );
          })}
        </View>

        {/* Next / Get Started button */}
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.8}>
          <LinearGradient colors={palette.gradients.primary} style={styles.nextBtnGradient}>
            <Text style={styles.nextBtnText}>{isLast ? 'Get Started' : 'Next'}</Text>
            <Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (palette) => { const colors = palette.colors; return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skipBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 16,
    right: 20,
    zIndex: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  skipText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  slide: {
    flex: 1,
  },
  slideGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxl,
    ...shadows.lg,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  featuresContainer: {
    alignSelf: 'stretch',
    gap: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  featureText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  bottomContainer: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextBtn: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.primaryMd,
  },
  nextBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  nextBtnText: {
    color: '#fff',
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
}); };
