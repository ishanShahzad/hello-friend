/**
 * ProfileScreen
 * User profile with role-based menu options
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 4.8
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import {
  colors,
  spacing,
  fontSize,
  borderRadius,
  shadows,
  fontWeight,
  typography,
  buttonStyles,
} from '../styles/theme';

// App version
const APP_VERSION = '1.0.0';

/**
 * Get menu items based on user role
 * Property 4: Role-Based Menu Visibility
 * Validates: Requirements 13.3, 13.4, 13.5
 */
export const getMenuItemsForRole = (role) => {
  const baseItems = [
    { id: 'orders', title: 'My Orders', icon: 'receipt-outline', screen: 'Orders' },
    { id: 'trusted', title: 'Trusted Stores', icon: 'shield-checkmark-outline', screen: 'TrustedStores' },
    { id: 'spin', title: 'Spin & Win', icon: 'gift-outline', screen: 'SpinWheel' },
  ];

  switch (role) {
    case 'admin':
      return [
        ...baseItems,
        { id: 'admin', title: 'Admin Dashboard', icon: 'settings-outline', screen: 'AdminDashboard', highlight: true },
      ];
    case 'seller':
      return [
        ...baseItems,
        { id: 'seller', title: 'Seller Dashboard', icon: 'storefront-outline', screen: 'SellerDashboard', highlight: true },
      ];
    case 'user':
    default:
      return [
        ...baseItems,
        { id: 'become-seller', title: 'Become a Seller', icon: 'storefront-outline', screen: 'BecomeSeller' },
      ];
  }
};

export default function ProfileScreen({ navigation }) {
  const { currentUser, logout } = useAuth();

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  }, [logout]);

  const handleLogin = useCallback(() => {
    navigation.navigate('Login');
  }, [navigation]);

  const handleMenuPress = useCallback((screen) => {
    navigation.navigate(screen);
  }, [navigation]);

  // Guest View
  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.guestContainer}>
          <View style={styles.guestContent}>
            {/* Guest Icon */}
            <View style={styles.guestIconContainer}>
              <Ionicons name="person-circle-outline" size={100} color={colors.grayLight} />
            </View>

            {/* Welcome Text */}
            <Text style={styles.guestTitle}>Welcome to Tortrose</Text>
            <Text style={styles.guestSubtitle}>
              Sign in to access your orders, wishlist, and personalized recommendations
            </Text>

            {/* Login Button */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>Login / Sign Up</Text>
            </TouchableOpacity>

            {/* Feature Highlights */}
            <View style={styles.guestFeatures}>
              <View style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  <Ionicons name="cart-outline" size={24} color={colors.primary} />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>Track Orders</Text>
                  <Text style={styles.featureDescription}>Monitor your purchases</Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  <Ionicons name="heart-outline" size={24} color={colors.primary} />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>Save Favorites</Text>
                  <Text style={styles.featureDescription}>Build your wishlist</Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  <Ionicons name="gift-outline" size={24} color={colors.primary} />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>Spin & Win</Text>
                  <Text style={styles.featureDescription}>Get exclusive discounts</Text>
                </View>
              </View>
            </View>
          </View>

          {/* App Version */}
          <View style={styles.appInfo}>
            <Text style={styles.appVersion}>Tortrose v{APP_VERSION}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Get menu items based on role
  const menuItems = getMenuItemsForRole(currentUser.role);

  // Get role badge color
  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'admin':
        return { backgroundColor: colors.error };
      case 'seller':
        return { backgroundColor: colors.success };
      default:
        return { backgroundColor: colors.primary };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.profileInfo}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              {currentUser.avatar ? (
                <Image source={{ uri: currentUser.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {currentUser.name?.charAt(0)?.toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
            </View>

            {/* User Info */}
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{currentUser.name}</Text>
              <Text style={styles.userEmail}>{currentUser.email}</Text>
              <View style={[styles.roleBadge, getRoleBadgeStyle(currentUser.role)]}>
                <Text style={styles.roleText}>
                  {currentUser.role?.charAt(0).toUpperCase() + currentUser.role?.slice(1)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                item.highlight && styles.menuItemHighlight,
                index === menuItems.length - 1 && styles.menuItemLast,
              ]}
              onPress={() => handleMenuPress(item.screen)}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <View style={[
                  styles.menuIconContainer,
                  item.highlight && styles.menuIconHighlight,
                ]}>
                  <Ionicons
                    name={item.icon}
                    size={22}
                    color={item.highlight ? colors.white : colors.primary}
                  />
                </View>
                <Text style={[
                  styles.menuItemText,
                  item.highlight && styles.menuItemTextHighlight,
                ]}>
                  {item.title}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.grayLight} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={22} color={colors.error} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>Tortrose v{APP_VERSION}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Guest styles
  guestContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  guestContent: {
    alignItems: 'center',
  },
  guestIconContainer: {
    marginBottom: spacing.xl,
  },
  guestTitle: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  guestSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    lineHeight: 22,
    maxWidth: 280,
  },
  loginButton: {
    ...buttonStyles.primary,
    paddingHorizontal: spacing.xxxl,
    marginBottom: spacing.xxl,
  },
  loginButtonText: {
    ...buttonStyles.primaryText,
    fontSize: fontSize.lg,
  },
  guestFeatures: {
    width: '100%',
    gap: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryLighter,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    ...typography.bodySemibold,
    marginBottom: 2,
  },
  featureDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  // Authenticated styles
  header: {
    backgroundColor: colors.white,
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: spacing.lg,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    ...typography.h3,
    marginBottom: 2,
  },
  userEmail: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  roleBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  roleText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
  // Menu styles
  menuContainer: {
    backgroundColor: colors.white,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
  },
  menuItemHighlight: {
    backgroundColor: colors.lighter,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryLighter,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuIconHighlight: {
    backgroundColor: colors.primary,
  },
  menuItemText: {
    ...typography.body,
    fontWeight: fontWeight.medium,
  },
  menuItemTextHighlight: {
    fontWeight: fontWeight.semibold,
  },
  // Logout styles
  logoutContainer: {
    backgroundColor: colors.white,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  logoutText: {
    ...typography.body,
    color: colors.error,
    fontWeight: fontWeight.semibold,
  },
  // App info
  appInfo: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  appVersion: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
