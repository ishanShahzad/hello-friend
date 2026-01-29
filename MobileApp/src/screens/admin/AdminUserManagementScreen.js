/**
 * AdminUserManagementScreen
 * Manage platform users
 * 
 * Requirements: 25.1, 25.2, 25.3, 25.4, 25.5, 25.6
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';
import Loader from '../../components/common/Loader';
import { EmptySearch } from '../../components/common/EmptyState';
import {
  colors,
  spacing,
  fontSize,
  borderRadius,
  shadows,
  fontWeight,
  typography,
  buttonStyles,
} from '../../styles/theme';

// Role filter tabs
const ROLE_TABS = [
  { id: 'all', label: 'All' },
  { id: 'user', label: 'Users' },
  { id: 'seller', label: 'Sellers' },
  { id: 'admin', label: 'Admins' },
];

/**
 * Filter users by role and search query
 * Exported for property testing
 */
export const filterUsers = (users, role, searchQuery) => {
  if (!Array.isArray(users)) return [];
  
  let filtered = users;
  
  // Filter by role
  if (role && role !== 'all') {
    filtered = filtered.filter(user => user.role === role);
  }
  
  // Filter by search query
  if (searchQuery && searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(user =>
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    );
  }
  
  return filtered;
};

const getRoleColor = (role) => {
  switch (role) {
    case 'admin': return colors.error;
    case 'seller': return colors.success;
    default: return colors.info;
  }
};

export default function AdminUserManagementScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/api/user/get');
      // Handle different response formats
      const userData = response.data?.users || response.data || [];
      setUsers(Array.isArray(userData) ? userData : []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
      Alert.alert('Error', 'Failed to fetch users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUsers();
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleUserPress = useCallback((user) => {
    setSelectedUser(user);
    setModalVisible(true);
  }, []);

  const updateUserRole = async (newRole) => {
    if (!selectedUser) return;
    
    try {
      await api.patch(`/api/user/update-role/${selectedUser._id}`, { role: newRole });
      setUsers(prev => prev.map(u => 
        u._id === selectedUser._id ? { ...u, role: newRole } : u
      ));
      Alert.alert('Success', 'User role updated successfully');
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update user role');
    }
  };

  const filteredUsers = filterUsers(users || [], activeTab, searchQuery);

  // Count users by role - ensure users is an array
  const roleCounts = (users || []).reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {});

  const renderHeader = useCallback(() => (
    <View style={styles.headerContainer}>
      {/* Title */}
      <View style={styles.titleRow}>
        <View style={styles.titleIcon}>
          <Ionicons name="people-outline" size={24} color={colors.white} />
        </View>
        <View>
          <Text style={styles.title}>User Management</Text>
          <Text style={styles.subtitle}>{users.length} total users</Text>
        </View>
      </View>

      {/* Search */}
      <View style={[
        styles.searchContainer,
        searchQuery.length > 0 && styles.searchContainerActive,
      ]}>
        <Ionicons name="search" size={20} color={colors.gray} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email..."
          placeholderTextColor={colors.grayLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={handleClearSearch}>
            <Ionicons name="close-circle" size={20} color={colors.gray} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <FlatList
        horizontal
        data={ROLE_TABS}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
        renderItem={({ item }) => {
          const isActive = activeTab === item.id;
          const count = item.id === 'all' ? users.length : (roleCounts[item.id] || 0);
          
          return (
            <TouchableOpacity
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(item.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {item.label}
              </Text>
              <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Results */}
      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>
          Showing <Text style={styles.resultsCount}>{filteredUsers.length}</Text> users
        </Text>
      </View>
    </View>
  ), [users.length, searchQuery, activeTab, roleCounts, filteredUsers.length, handleClearSearch]);

  const renderUser = useCallback(({ item }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => handleUserPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <View style={[styles.avatar, { backgroundColor: getRoleColor(item.role) + '30' }]}>
          <Text style={[styles.avatarText, { color: getRoleColor(item.role) }]}>
            {item.name?.charAt(0)?.toUpperCase() || 'U'}
          </Text>
        </View>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
        <Text style={styles.userDate}>
          Joined {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) }]}>
        <Text style={styles.roleText}>{item.role}</Text>
      </View>
    </TouchableOpacity>
  ), [handleUserPress]);

  const renderEmptyComponent = useCallback(() => {
    if (searchQuery) {
      return <EmptySearch query={searchQuery} onClear={handleClearSearch} />;
    }
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={64} color={colors.grayLight} />
        <Text style={styles.emptyTitle}>No users found</Text>
      </View>
    );
  }, [searchQuery, handleClearSearch]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Loader fullScreen message="Loading users..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredUsers}
        renderItem={renderUser}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyComponent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* User Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>User Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <>
                <View style={styles.modalUserInfo}>
                  <View style={[styles.modalAvatar, { backgroundColor: getRoleColor(selectedUser.role) + '30' }]}>
                    <Text style={[styles.modalAvatarText, { color: getRoleColor(selectedUser.role) }]}>
                      {selectedUser.name?.charAt(0)?.toUpperCase() || 'U'}
                    </Text>
                  </View>
                  <Text style={styles.modalUserName}>{selectedUser.name}</Text>
                  <Text style={styles.modalUserEmail}>{selectedUser.email}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Change Role</Text>
                  <View style={styles.roleOptions}>
                    {['user', 'seller', 'admin'].map((role) => (
                      <TouchableOpacity
                        key={role}
                        style={[
                          styles.roleOption,
                          selectedUser.role === role && styles.roleOptionActive,
                          { borderColor: getRoleColor(role) },
                        ]}
                        onPress={() => updateUserRole(role)}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.roleOptionText,
                          selectedUser.role === role && { color: getRoleColor(role) },
                        ]}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </Text>
                        {selectedUser.role === role && (
                          <Ionicons name="checkmark" size={18} color={getRoleColor(role)} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Header
  headerContainer: {
    backgroundColor: colors.white,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  titleIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  title: {
    ...typography.h3,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    height: 44,
    borderWidth: 2,
    borderColor: colors.light,
  },
  searchContainerActive: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
  },
  // Tabs
  tabsContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.lighter,
    gap: spacing.xs,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    ...typography.bodySmall,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.white,
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  tabBadgeText: {
    ...typography.caption,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  tabBadgeTextActive: {
    color: colors.white,
  },
  // Results
  resultsRow: {
    paddingHorizontal: spacing.lg,
  },
  resultsText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  resultsCount: {
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  // List
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  // User Card
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.xl,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.light,
  },
  avatarContainer: {
    marginRight: spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    ...typography.bodySemibold,
    marginBottom: 2,
  },
  userEmail: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  userDate: {
    ...typography.caption,
    color: colors.grayLight,
  },
  roleBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  roleText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
  },
  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    ...typography.h3,
    marginTop: spacing.lg,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    padding: spacing.xl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  modalTitle: {
    ...typography.h3,
  },
  modalUserInfo: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalAvatarText: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
  },
  modalUserName: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  modalUserEmail: {
    ...typography.body,
    color: colors.textSecondary,
  },
  modalSection: {
    marginBottom: spacing.xl,
  },
  modalSectionTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  roleOptions: {
    gap: spacing.sm,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.light,
    backgroundColor: colors.white,
  },
  roleOptionActive: {
    backgroundColor: colors.lighter,
  },
  roleOptionText: {
    ...typography.body,
    fontWeight: fontWeight.medium,
  },
});
