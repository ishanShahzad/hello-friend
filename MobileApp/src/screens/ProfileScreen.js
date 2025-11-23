import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, fontSize, borderRadius, shadows } from '../styles/theme';

export default function ProfileScreen({ navigation }) {
  const { currentUser, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: logout, style: 'destructive' }
      ]
    );
  };

  const MenuItem = ({ icon, title, onPress, color = colors.dark }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <Ionicons name={icon} size={24} color={color} />
        <Text style={[styles.menuItemText, { color }]}>{title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.gray} />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle" size={80} color={colors.primary} />
        </View>
        <Text style={styles.userName}>{currentUser?.name || 'User'}</Text>
        <Text style={styles.userEmail}>{currentUser?.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.menuContainer}>
          <MenuItem
            icon="person-outline"
            title="Edit Profile"
            onPress={() => Toast.show({ type: 'info', text1: 'Coming Soon', text2: 'This feature will be available soon' })}
          />
          <MenuItem
            icon="receipt-outline"
            title="My Orders"
            onPress={() => navigation.navigate('Orders')}
          />
          {currentUser?.role === 'admin' && (
            <MenuItem
              icon="shield-checkmark-outline"
              title="Admin Dashboard"
              onPress={() => navigation.navigate('AdminDashboard')}
            />
          )}
          {currentUser?.role === 'seller' && (
            <MenuItem
              icon="storefront-outline"
              title="Seller Dashboard"
              onPress={() => navigation.navigate('SellerDashboard')}
            />
          )}
          <MenuItem
            icon="location-outline"
            title="Addresses"
            onPress={() => Toast.show({ type: 'info', text1: 'Coming Soon', text2: 'This feature will be available soon' })}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.menuContainer}>
          <MenuItem
            icon="notifications-outline"
            title="Notifications"
            onPress={() => Toast.show({ type: 'info', text1: 'Coming Soon', text2: 'This feature will be available soon' })}
          />
          <MenuItem
            icon="card-outline"
            title="Payment Methods"
            onPress={() => Toast.show({ type: 'info', text1: 'Coming Soon', text2: 'This feature will be available soon' })}
          />
          <MenuItem
            icon="language-outline"
            title="Language"
            onPress={() => Toast.show({ type: 'info', text1: 'Coming Soon', text2: 'This feature will be available soon' })}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.menuContainer}>
          <MenuItem
            icon="help-circle-outline"
            title="Help Center"
            onPress={() => Toast.show({ type: 'info', text1: 'Coming Soon', text2: 'This feature will be available soon' })}
          />
          <MenuItem
            icon="information-circle-outline"
            title="About"
            onPress={() => Toast.show({ type: 'info', text1: 'Your Store App', text2: 'Version 1.0.0' })}
          />
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={colors.danger} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.white,
    alignItems: 'center',
    padding: spacing.xl,
    marginBottom: spacing.md,
  },
  avatarContainer: {
    marginBottom: spacing.md,
  },
  userName: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: spacing.md,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  menuContainer: {
    backgroundColor: colors.white,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: fontSize.md,
    marginLeft: spacing.md,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  logoutText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.danger,
    marginLeft: spacing.sm,
  },
});
