/**
 * StatCard Component
 * Dashboard statistics display card
 * 
 * Requirements: 17.2, 24.2
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
  shadows,
  cardStyles,
  typography,
} from '../../styles/theme';

const StatCard = ({
  title,
  value,
  icon,
  iconColor = colors.primary,
  iconBgColor = colors.primaryLighter,
  trend,
  onPress,
  style,
  compact = false,
}) => {
  const Container = onPress ? TouchableOpacity : View;
  const containerProps = onPress ? { onPress, activeOpacity: 0.7 } : {};

  const formatValue = (val) => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`;
      }
      if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`;
      }
      return val.toLocaleString();
    }
    return val;
  };

  return (
    <Container 
      style={[
        styles.container, 
        compact && styles.containerCompact,
        style
      ]} 
      {...containerProps}
    >
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
        <Ionicons name={icon} size={compact ? 20 : 24} color={iconColor} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Value */}
        <Text style={[styles.value, compact && styles.valueCompact]} numberOfLines={1}>
          {formatValue(value)}
        </Text>

        {/* Title */}
        <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={1}>
          {title}
        </Text>

        {/* Trend Indicator */}
        {trend && (
          <View style={styles.trendContainer}>
            <Ionicons
              name={trend.isPositive ? 'trending-up' : 'trending-down'}
              size={14}
              color={trend.isPositive ? colors.success : colors.error}
            />
            <Text
              style={[
                styles.trendText,
                { color: trend.isPositive ? colors.success : colors.error },
              ]}
            >
              {trend.isPositive ? '+' : ''}{trend.value}%
            </Text>
          </View>
        )}
      </View>

      {/* Navigation indicator */}
      {onPress && (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.grayLight}
          style={styles.chevron}
        />
      )}
    </Container>
  );
};

// Preset stat cards for common metrics
export const RevenueStatCard = ({ value, trend, onPress }) => (
  <StatCard
    title="Revenue"
    value={`$${typeof value === 'number' ? value.toLocaleString() : value}`}
    icon="cash-outline"
    iconColor={colors.success}
    iconBgColor={colors.successLighter}
    trend={trend}
    onPress={onPress}
  />
);

export const OrdersStatCard = ({ value, trend, onPress }) => (
  <StatCard
    title="Total Orders"
    value={value}
    icon="receipt-outline"
    iconColor={colors.info}
    iconBgColor={colors.infoLighter}
    trend={trend}
    onPress={onPress}
  />
);

export const ProductsStatCard = ({ value, trend, onPress }) => (
  <StatCard
    title="Products"
    value={value}
    icon="cube-outline"
    iconColor={colors.secondary}
    iconBgColor={colors.secondaryLighter}
    trend={trend}
    onPress={onPress}
  />
);

export const UsersStatCard = ({ value, trend, onPress }) => (
  <StatCard
    title="Total Users"
    value={value}
    icon="people-outline"
    iconColor={colors.primary}
    iconBgColor={colors.primaryLighter}
    trend={trend}
    onPress={onPress}
  />
);

export const StoresStatCard = ({ value, trend, onPress }) => (
  <StatCard
    title="Total Stores"
    value={value}
    icon="storefront-outline"
    iconColor={colors.warning}
    iconBgColor={colors.warningLighter}
    trend={trend}
    onPress={onPress}
  />
);

export const PendingOrdersStatCard = ({ value, onPress }) => (
  <StatCard
    title="Pending Orders"
    value={value}
    icon="time-outline"
    iconColor={colors.warning}
    iconBgColor={colors.warningLighter}
    onPress={onPress}
  />
);

const styles = StyleSheet.create({
  container: {
    ...cardStyles.stat,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  containerCompact: {
    padding: spacing.md,
    minWidth: 120,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  value: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  valueCompact: {
    fontSize: fontSize.xl,
  },
  title: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  titleCompact: {
    fontSize: fontSize.xs,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  trendText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    marginLeft: spacing.xs,
  },
  chevron: {
    marginLeft: spacing.sm,
  },
});

export default StatCard;
