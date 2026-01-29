/**
 * EmptyState Component
 * Consistent empty state display across the app
 * 
 * Requirements: 3.1, 3.4
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  colors, 
  spacing, 
  fontSize, 
  fontWeight, 
  borderRadius,
  buttonStyles,
  typography,
} from '../../styles/theme';

const EmptyState = ({
  icon = 'cube-outline',
  iconSize = 64,
  iconColor = colors.grayLight,
  title,
  subtitle,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  style,
  compact = false,
}) => {
  return (
    <View style={[styles.container, compact && styles.containerCompact, style]}>
      {/* Icon */}
      <View style={[styles.iconContainer, compact && styles.iconContainerCompact]}>
        <Ionicons 
          name={icon} 
          size={compact ? 48 : iconSize} 
          color={iconColor} 
        />
      </View>

      {/* Title */}
      {title && (
        <Text style={[styles.title, compact && styles.titleCompact]}>
          {title}
        </Text>
      )}

      {/* Subtitle */}
      {subtitle && (
        <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>
          {subtitle}
        </Text>
      )}

      {/* Actions */}
      {(actionLabel || secondaryActionLabel) && (
        <View style={styles.actionsContainer}>
          {/* Primary Action */}
          {actionLabel && onAction && (
            <TouchableOpacity 
              style={[buttonStyles.primary, styles.actionButton]}
              onPress={onAction}
              activeOpacity={0.8}
            >
              <Text style={buttonStyles.primaryText}>{actionLabel}</Text>
            </TouchableOpacity>
          )}

          {/* Secondary Action */}
          {secondaryActionLabel && onSecondaryAction && (
            <TouchableOpacity 
              style={[buttonStyles.outline, styles.secondaryButton]}
              onPress={onSecondaryAction}
              activeOpacity={0.8}
            >
              <Text style={buttonStyles.outlineText}>{secondaryActionLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

// Preset empty states for common scenarios
export const EmptyCart = ({ onBrowse }) => (
  <EmptyState
    icon="cart-outline"
    title="Your cart is empty"
    subtitle="Looks like you haven't added any items to your cart yet"
    actionLabel="Browse Products"
    onAction={onBrowse}
  />
);

export const EmptyWishlist = ({ onBrowse }) => (
  <EmptyState
    icon="heart-outline"
    title="Your wishlist is empty"
    subtitle="Save items you love by tapping the heart icon"
    actionLabel="Discover Products"
    onAction={onBrowse}
  />
);

export const EmptyOrders = ({ onBrowse }) => (
  <EmptyState
    icon="receipt-outline"
    title="No orders yet"
    subtitle="When you place an order, it will appear here"
    actionLabel="Start Shopping"
    onAction={onBrowse}
  />
);

export const EmptyProducts = ({ onAdd }) => (
  <EmptyState
    icon="cube-outline"
    title="No products yet"
    subtitle="Add your first product to start selling"
    actionLabel="Add Product"
    onAction={onAdd}
  />
);

export const EmptyStores = ({ onRefresh }) => (
  <EmptyState
    icon="storefront-outline"
    title="No stores found"
    subtitle="Try adjusting your search or check back later"
    actionLabel="Refresh"
    onAction={onRefresh}
  />
);

export const EmptySearch = ({ query, onClear }) => (
  <EmptyState
    icon="search-outline"
    title="No results found"
    subtitle={query ? `We couldn't find anything for "${query}"` : 'Try a different search term'}
    actionLabel="Clear Search"
    onAction={onClear}
  />
);

export const EmptyNotifications = () => (
  <EmptyState
    icon="notifications-outline"
    title="No notifications"
    subtitle="You're all caught up!"
  />
);

export const ErrorState = ({ message, onRetry }) => (
  <EmptyState
    icon="alert-circle-outline"
    iconColor={colors.error}
    title="Something went wrong"
    subtitle={message || "We couldn't load the content. Please try again."}
    actionLabel="Try Again"
    onAction={onRetry}
  />
);

export const OfflineState = ({ onRetry }) => (
  <EmptyState
    icon="cloud-offline-outline"
    iconColor={colors.warning}
    title="You're offline"
    subtitle="Please check your internet connection and try again"
    actionLabel="Retry"
    onAction={onRetry}
  />
);

export const LoginRequired = ({ onLogin, onBrowse }) => (
  <EmptyState
    icon="person-outline"
    title="Login Required"
    subtitle="Please sign in to access this feature"
    actionLabel="Sign In"
    onAction={onLogin}
    secondaryActionLabel="Continue Browsing"
    onSecondaryAction={onBrowse}
  />
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxxl,
  },
  containerCompact: {
    paddingVertical: spacing.xxl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.full,
    backgroundColor: colors.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainerCompact: {
    width: 72,
    height: 72,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  titleCompact: {
    fontSize: fontSize.lg,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
  subtitleCompact: {
    fontSize: fontSize.sm,
    maxWidth: 240,
  },
  actionsContainer: {
    marginTop: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  actionButton: {
    minWidth: 160,
  },
  secondaryButton: {
    minWidth: 160,
  },
});

export default EmptyState;
