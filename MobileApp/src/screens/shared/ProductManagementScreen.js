/**
 * ProductManagementScreen
 * Manage products for sellers and admins
 * 
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7
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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';
import Loader from '../../components/common/Loader';
import { EmptyProducts, EmptySearch } from '../../components/common/EmptyState';
import {
  colors,
  spacing,
  fontSize,
  borderRadius,
  shadows,
  fontWeight,
  typography,
} from '../../styles/theme';

/**
 * Filter products by search query
 * Exported for property testing
 */
export const filterProductsByQuery = (products, query) => {
  if (!query || !query.trim()) return products;
  const normalizedQuery = query.toLowerCase().trim();
  return products.filter(product =>
    product.name?.toLowerCase().includes(normalizedQuery) ||
    product.category?.toLowerCase().includes(normalizedQuery) ||
    product.brand?.toLowerCase().includes(normalizedQuery)
  );
};

/**
 * Get stock status info
 */
const getStockStatus = (stock) => {
  if (stock === 0) {
    return { label: 'Out of Stock', color: colors.error, bgColor: colors.errorLighter };
  }
  if (stock <= 5) {
    return { label: 'Low Stock', color: colors.warning, bgColor: colors.warningLighter };
  }
  return { label: 'In Stock', color: colors.success, bgColor: colors.successLighter };
};

export default function ProductManagementScreen({ navigation, route }) {
  const { isAdmin } = route.params || {};
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const endpoint = isAdmin ? '/api/products/get-products' : '/api/products/get-seller-products';
      const response = await api.get(endpoint);
      setProducts(response.data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
  }, [isAdmin]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const deleteProduct = useCallback((productId, productName) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${productName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(productId);
            try {
              await api.delete(`/api/products/delete/${productId}`);
              setProducts(prev => prev.filter(p => p._id !== productId));
              Alert.alert('Success', 'Product deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete product');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  }, []);

  const filteredProducts = filterProductsByQuery(products, searchQuery);

  const renderProduct = useCallback(({ item }) => {
    const stockStatus = getStockStatus(item.stock);
    const isDeleting = deletingId === item._id;

    return (
      <TouchableOpacity
        style={[styles.productCard, isDeleting && styles.productCardDeleting]}
        onPress={() => navigation.navigate('ProductForm', { product: item, isAdmin })}
        activeOpacity={0.7}
        disabled={isDeleting}
      >
        {/* Product Image */}
        <View style={styles.imageContainer}>
          {item.images?.[0] ? (
            <Image
              source={{ uri: item.images[0] }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.productImage, styles.imagePlaceholder]}>
              <Ionicons name="cube-outline" size={24} color={colors.grayLight} />
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          
          <View style={styles.priceRow}>
            <Text style={styles.productPrice}>
              ${item.discountedPrice || item.price}
            </Text>
            {item.discountedPrice && item.discountedPrice < item.price && (
              <Text style={styles.originalPrice}>${item.price}</Text>
            )}
          </View>

          <View style={styles.metaRow}>
            <View style={[styles.stockBadge, { backgroundColor: stockStatus.bgColor }]}>
              <Text style={[styles.stockText, { color: stockStatus.color }]}>
                {item.stock} in stock
              </Text>
            </View>
            {item.category && (
              <Text style={styles.categoryText} numberOfLines={1}>
                {item.category}
              </Text>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('ProductForm', { product: item, isAdmin })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="create-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => deleteProduct(item._id, item.name)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={isDeleting}
          >
            <Ionicons 
              name="trash-outline" 
              size={22} 
              color={isDeleting ? colors.grayLight : colors.error} 
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }, [navigation, isAdmin, deletingId, deleteProduct]);

  const renderHeader = useCallback(() => (
    <View style={styles.headerContainer}>
      {/* Search Bar */}
      <View style={[
        styles.searchContainer,
        searchQuery.length > 0 && styles.searchContainerActive,
      ]}>
        <Ionicons name="search" size={20} color={colors.gray} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
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

      {/* Results Count */}
      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>
          {searchQuery ? (
            <>Found <Text style={styles.resultsCount}>{filteredProducts.length}</Text> products</>
          ) : (
            <><Text style={styles.resultsCount}>{filteredProducts.length}</Text> products total</>
          )}
        </Text>
      </View>
    </View>
  ), [searchQuery, filteredProducts.length, handleClearSearch]);

  const renderEmptyComponent = useCallback(() => {
    if (searchQuery) {
      return <EmptySearch query={searchQuery} onClear={handleClearSearch} />;
    }
    return (
      <EmptyProducts 
        onAdd={() => navigation.navigate('ProductForm', { isAdmin })} 
      />
    );
  }, [searchQuery, handleClearSearch, navigation, isAdmin]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Loader fullScreen message="Loading products..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
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

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('ProductForm', { isAdmin })}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>
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
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    height: 48,
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
  resultsRow: {
    marginTop: spacing.md,
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
    paddingBottom: 100,
    flexGrow: 1,
  },
  // Product Card
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.light,
  },
  productCardDeleting: {
    opacity: 0.5,
  },
  imageContainer: {
    marginRight: spacing.md,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.lighter,
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    ...typography.bodySemibold,
    marginBottom: spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  productPrice: {
    ...typography.bodySemibold,
    color: colors.primary,
  },
  originalPrice: {
    ...typography.bodySmall,
    color: colors.grayLight,
    textDecorationLine: 'line-through',
    marginLeft: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stockBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  stockText: {
    ...typography.caption,
    fontWeight: fontWeight.medium,
  },
  categoryText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  // Actions
  actions: {
    flexDirection: 'column',
    gap: spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.lighter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // FAB
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
});
