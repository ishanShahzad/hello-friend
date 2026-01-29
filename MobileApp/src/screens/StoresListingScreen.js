/**
 * StoresListingScreen
 * Browse and search all stores
 * 
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import StoreCard from '../components/common/StoreCard';
import Loader from '../components/common/Loader';
import { EmptyStores, EmptySearch } from '../components/common/EmptyState';
import {
  colors,
  spacing,
  fontSize,
  borderRadius,
  shadows,
  fontWeight,
  typography,
} from '../styles/theme';

/**
 * Filter stores by search query
 * Exported for property testing
 */
export const filterStoresByQuery = (stores, query) => {
  if (!query || !query.trim()) return stores;
  const normalizedQuery = query.toLowerCase().trim();
  return stores.filter(store =>
    store.storeName?.toLowerCase().includes(normalizedQuery) ||
    store.description?.toLowerCase().includes(normalizedQuery)
  );
};

export default function StoresListingScreen({ navigation }) {
  const { currentUser } = useAuth();
  const [stores, setStores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    fetchStores();
  }, [sortBy]);

  const fetchStores = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/stores/all?sort=${sortBy}`);
      setStores(res.data.stores || []);
    } catch (error) {
      console.error('Error fetching stores:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStores();
  }, [sortBy]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleBrowseProducts = useCallback(() => {
    navigation.navigate('Home');
  }, [navigation]);

  const filteredStores = filterStoresByQuery(stores, searchQuery);

  const renderStoreCard = useCallback(({ item, index }) => (
    <View style={styles.cardWrapper}>
      <StoreCard
        store={{
          _id: item._id,
          storeName: item.storeName,
          storeSlug: item.storeSlug,
          description: item.storeDescription || item.description,
          logo: item.storeLogo || item.logo,
          banner: item.storeBanner || item.banner,
          trustCount: item.trustCount || 0,
          verification: { isVerified: item.isVerified },
          productCount: item.productCount || 0,
          views: item.views || 0,
        }}
        index={index}
        showTrustButton={!!currentUser}
        showDescription={true}
        showStats={true}
      />
    </View>
  ), [currentUser]);

  const renderHeader = useCallback(() => (
    <View style={styles.headerContainer}>
      {/* Title Section */}
      <View style={styles.titleSection}>
        <View style={styles.titleRow}>
          <View style={styles.iconContainer}>
            <Ionicons name="storefront" size={28} color={colors.white} />
          </View>
          <View style={styles.titleTextContainer}>
            <Text style={styles.title}>Discover Stores</Text>
            <Text style={styles.subtitle}>Explore amazing sellers and their products</Text>
          </View>
        </View>
        
        {currentUser && (
          <TouchableOpacity
            style={styles.trustedButton}
            onPress={() => navigation.navigate('TrustedStores')}
            activeOpacity={0.8}
          >
            <Ionicons name="heart" size={16} color={colors.white} />
            <Text style={styles.trustedButtonText}>Trusted</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={[
          styles.searchInputContainer,
          searchQuery.length > 0 && styles.searchInputActive,
        ]}>
          <Ionicons name="search" size={20} color={colors.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search stores..."
            placeholderTextColor={colors.grayLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={handleClearSearch}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={20} color={colors.gray} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results Count */}
      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>
          {searchQuery ? (
            <>
              Found <Text style={styles.resultsCount}>{filteredStores.length}</Text> {filteredStores.length === 1 ? 'store' : 'stores'}
            </>
          ) : (
            <>
              <Text style={styles.resultsCount}>{filteredStores.length}</Text> {filteredStores.length === 1 ? 'store' : 'stores'} available
            </>
          )}
        </Text>
      </View>
    </View>
  ), [currentUser, searchQuery, filteredStores.length, navigation, handleClearSearch]);

  const renderEmptyComponent = useCallback(() => {
    if (searchQuery) {
      return (
        <EmptySearch 
          query={searchQuery} 
          onClear={handleClearSearch} 
        />
      );
    }
    return (
      <EmptyStores onRefresh={onRefresh} />
    );
  }, [searchQuery, handleClearSearch, onRefresh]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Loader fullScreen message="Loading stores..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredStores}
        keyExtractor={(item) => item._id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        renderItem={renderStoreCard}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={renderEmptyComponent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    backgroundColor: colors.white,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  titleTextContainer: {
    flex: 1,
  },
  title: {
    ...typography.h2,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  trustedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.heart,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  trustedButtonText: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.sm,
  },
  searchSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    height: 48,
    borderWidth: 2,
    borderColor: colors.light,
  },
  searchInputActive: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
  },
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
  listContent: {
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  row: {
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  cardWrapper: {
    flex: 1,
    marginBottom: spacing.sm,
  },
});
