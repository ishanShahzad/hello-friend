import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../styles/theme';
import api from '../../config/api';

export default function StoreOverviewScreen({ route }) {
  const { isAdmin } = route.params || {};
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const endpoint = isAdmin ? '/api/order/get' : '/api/stores/analytics';
      const response = await api.get(endpoint);
      
      // Calculate stats from orders
      if (isAdmin) {
        const orders = response.data;
        setStats({
          totalRevenue: orders.reduce((sum, order) => sum + order.totalPrice, 0),
          totalOrders: orders.length,
          totalProducts: 0, // Would need separate API call
          totalCustomers: new Set(orders.map(o => o.user)).size,
        });
      } else {
        setStats(response.data);
      }
    } catch (error) {
      console.log('Error fetching stats:', error);
      setStats({
        totalRevenue: 0,
        totalOrders: 0,
        totalProducts: 0,
        totalCustomers: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const statCards = [
    { title: 'Total Revenue', value: `$${stats?.totalRevenue || 0}`, icon: 'cash', color: colors.success },
    { title: 'Total Orders', value: stats?.totalOrders || 0, icon: 'receipt', color: colors.primary },
    { title: 'Total Products', value: stats?.totalProducts || 0, icon: 'cube', color: colors.warning },
    { title: 'Total Customers', value: stats?.totalCustomers || 0, icon: 'people', color: colors.info },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.grid}>
        {statCards.map((card, index) => (
          <View key={index} style={[styles.statCard, { borderLeftColor: card.color }]}>
            <View style={[styles.iconContainer, { backgroundColor: card.color + '20' }]}>
              <Ionicons name={card.icon} size={30} color={card.color} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statTitle}>{card.title}</Text>
              <Text style={styles.statValue}>{card.value}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grid: {
    padding: spacing.md,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    ...shadows.small,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  statInfo: {
    flex: 1,
  },
  statTitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.text,
  },
});
