/**
 * ProfileScreen — Liquid Glass Design
 * User profile with role-based menu options
 */

import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import GlassBackground from '../components/common/GlassBackground';
import GlassPanel from '../components/common/GlassPanel';
import {
  colors, spacing, fontSize, borderRadius, fontWeight, typography,
} from '../styles/theme';

const APP_VERSION = '1.0.0';

export const getMenuItemsForRole = (role) => {
  const baseItems = [
    { id: 'orders', title: 'My Orders', icon: 'receipt-outline', screen: 'Orders', color: colors.primary },
    { id: 'notifications', title: 'Notifications', icon: 'notifications-outline', screen: 'Notifications', color: colors.secondary },
    { id: 'trusted', title: 'Trusted Stores', icon: 'shield-checkmark-outline', screen: 'TrustedStores', color: colors.info },
    { id: 'change-password', title: 'Change Password', icon: 'lock-closed-outline', screen: 'ChangePassword', color: colors.warning },
    { id: 'settings', title: 'Settings', icon: 'settings-outline', screen: 'Settings', color: colors.textSecondary },
  ];
  switch (role) {
    case 'admin':
      return [...baseItems, { id: 'admin', title: 'Admin Dashboard', icon: 'shield-outline', screen: 'AdminDashboard', highlight: true, color: colors.error }];
    case 'seller':
      return [...baseItems, { id: 'seller', title: 'Seller Dashboard', icon: 'storefront-outline', screen: 'SellerDashboard', highlight: true, color: colors.success }];
    case 'user':
    default:
      return [...baseItems, { id: 'become-seller', title: 'Become a Seller', icon: 'storefront-outline', screen: 'BecomeSeller', color: colors.secondary }];
  }
};

export default function ProfileScreen({ navigation }) {
  const { currentUser, logout } = useAuth();

  const handleLogout = useCallback(() => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  }, [logout]);

  // Guest View
  if (!currentUser) {
    return (
      <GlassBackground>
        <View style={styles.guestContainer}>
          <GlassPanel variant="strong" style={styles.guestCard}>
            <View style={styles.guestAvatarCircle}>
              <Ionicons name="person-outline" size={48} color={colors.primary} />
            </View>
            <Text style={styles.guestTitle}>Welcome to Tortrose</Text>
            <Text style={styles.guestSubtitle}>Sign in to access your account</Text>
            <TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
              <Text style={styles.loginButtonText}>Login / Sign Up</Text>
            </TouchableOpacity>
          </GlassPanel>

          <GlassPanel variant="card" style={styles.featuresCard}>
            {[
              { icon: 'receipt-outline', title: 'Track Orders', desc: 'Monitor your purchases in real time' },
              { icon: 'heart-outline', title: 'Save Favorites', desc: 'Build and manage your wishlist' },
              { icon: 'shield-checkmark-outline', title: 'Trusted Stores', desc: 'Shop from verified sellers' },
            ].map((f) => (
              <View key={f.icon} style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Ionicons name={f.icon} size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureDesc}>{f.desc}</Text>
                </View>
              </View>
            ))}
          </GlassPanel>
          <Text style={styles.appVersion}>Tortrose v{APP_VERSION}</Text>
        </View>
      </GlassBackground>
    );
  }

  const menuItems = getMenuItemsForRole(currentUser.role);
  const roleLabel = currentUser.role?.charAt(0).toUpperCase() + currentUser.role?.slice(1);

  return (
    <GlassBackground>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Profile Header */}
        <GlassPanel variant="strong" style={styles.profileHeader}>
          <View style={styles.avatarWrapper}>
            {currentUser.avatar ? (
              <Image source={{ uri: currentUser.avatar }} style={styles.avatar} contentFit="cover" cachePolicy="memory-disk" transition={200} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{currentUser.name?.charAt(0)?.toUpperCase() || 'U'}</Text>
              </View>
            )}
          </View>
          <Text style={styles.profileName}>{currentUser.name}</Text>
          <Text style={styles.profileEmail}>{currentUser.email}</Text>
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>{roleLabel}</Text>
          </View>
          <TouchableOpacity style={styles.editProfileBtn} onPress={() => navigation.navigate('EditProfile')} activeOpacity={0.8}>
            <Ionicons name="pencil-outline" size={14} color={colors.primary} />
            <Text style={styles.editProfileBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </GlassPanel>

        {/* Menu Section */}
        <GlassPanel variant="card" style={styles.menuCard}>
          <Text style={styles.sectionLabel}>MY ACCOUNT</Text>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuRow, index < menuItems.length - 1 && styles.menuRowBorder]}
              onPress={() => navigation.navigate(item.screen)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIcon, { backgroundColor: (item.color || colors.primary) + '18' }]}>
                <Ionicons name={item.icon} size={20} color={item.color || colors.primary} />
              </View>
              <Text style={styles.menuRowText}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </GlassPanel>

        {/* Logout */}
        <GlassPanel variant="card" style={styles.logoutCard}>
          <TouchableOpacity style={styles.menuRow} onPress={handleLogout} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
              <Ionicons name="log-out-outline" size={20} color={colors.error} />
            </View>
            <Text style={[styles.menuRowText, { color: colors.error }]}>Logout</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.errorLight} />
          </TouchableOpacity>
        </GlassPanel>

        <Text style={styles.appVersion}>Tortrose v{APP_VERSION}</Text>
        <View style={{ height: 80 }} />
      </ScrollView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xxl },
  // Guest
  guestContainer: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  guestCard: { padding: spacing.xxl, alignItems: 'center', marginBottom: spacing.lg },
  guestAvatarCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(99,102,241,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg,
  },
  guestTitle: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.xs },
  guestSubtitle: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.xl },
  loginButton: {
    backgroundColor: colors.primary, paddingVertical: spacing.md, paddingHorizontal: spacing.xxxl, borderRadius: borderRadius.lg,
  },
  loginButtonText: { color: colors.white, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  featuresCard: { padding: spacing.lg },
  featureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
  featureIcon: {
    width: 44, height: 44, borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(99,102,241,0.08)', justifyContent: 'center', alignItems: 'center',
  },
  featureTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  featureDesc: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  // Profile
  profileHeader: { margin: spacing.lg, padding: spacing.xl, alignItems: 'center' },
  avatarWrapper: { marginBottom: spacing.md },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: 'rgba(99,102,241,0.3)' },
  avatarPlaceholder: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(99,102,241,0.15)', justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: 'rgba(99,102,241,0.2)',
  },
  avatarText: { fontSize: 36, fontWeight: fontWeight.bold, color: colors.primary },
  profileName: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.xs },
  profileEmail: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.md },
  rolePill: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, borderRadius: borderRadius.full,
    backgroundColor: 'rgba(99,102,241,0.12)',
  },
  rolePillText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  editProfileBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full, borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)',
    backgroundColor: 'rgba(99,102,241,0.06)',
  },
  editProfileBtnText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  // Menu
  menuCard: { marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.md },
  sectionLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textLight, letterSpacing: 1, marginBottom: spacing.sm, paddingLeft: spacing.sm },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.sm, gap: spacing.md },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  menuIcon: { width: 40, height: 40, borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center' },
  menuRowText: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text },
  logoutCard: { marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.md },
  appVersion: { fontSize: fontSize.xs, color: colors.textLight, textAlign: 'center', paddingVertical: spacing.xl },
});
