/**
 * HomeScreen
 * Modern home screen with product browsing, search, and filters
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.6, 6.7, 6.8
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import ProductCard from '../components/ProductCard';
import SpinBanner from '../components/SpinBanner';
import CurrencySelector from '../components/CurrencySelector';
import { Loader, EmptySearch } from '../components/common';
import { useAuth } from '../contexts/AuthContext';
import { useGlobal } from '../contexts/GlobalContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { 
  colors, 
  spacing, 
  fontSize, 
  borderRadius, 
  shadows, 
  fontWeight,
  typography,
} from '../styles/theme';

export default function HomeScreen({ navigation }) {
  const { currentUser } = useAuth();
  const { fetchCart, spinResult, fetchActiveSpin } = useGlobal();
  const { formatPrice } = useCurrency();
  
  const [products, setProducts] = useState([]);
  const [displayProducts, setDisplayProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);

  // Animation for header
  const scrollY = new Animated.Value(0);

  useEffect(() => {
    fetchProducts();
    fetchFilters();
    if (currentUser) {
      fetchCart();
      fetchActiveSpin();
    }
  }, [currentUser]);

  useEffect(() => {
    applySpinDiscount();
  }, [products, spinResult]);

  const applySpinDiscount = () => {
    if (!spinResult || spinResult.hasCheckedOut) {
      setDisplayProducts(products);
      return;
    }
    const discountedProducts = products.map(product => {
      let newPrice = product.price;
      const type = spinResult.type || spinResult.discountType;
      const value = spinResult.value || spinResult.discount;
      if (type === 'free') {
        newPrice = 0;
      } else if (type === 'fixed') {
        newPrice = value;
      } else if (type === 'percentage') {
        newPrice = product.price * (1 - value / 100);
      }
      return {
        ...product,
        originalPrice: product.price,
        spinDiscountedPrice: Math.max(0, newPrice),
        hasSpinDiscount: true
      };
    });
    setDisplayProducts(discountedProducts);
  };

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategories.length > 0) {
        selectedCategories.forEach(cat => params.append('categories', cat));
      }
      if (selectedBrands.length > 0) {
        selectedBrands.forEach(brand => params.append('brands', brand));
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      const res = await axios.get(`${API_BASE_URL}/api/products/get-products?${params.toString()}`);
      setProducts(res.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const fetchFilters = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/products/get-filters`);
      setCategories(res.data.categories || []);
      setBrands(res.data.brands || []);
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
    if (currentUser) fetchActiveSpin();
  };

  const handleSearch = () => {
    setIsLoading(true);
    fetchProducts();
  };

  const toggleCategory = (category) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const toggleBrand = (brand) => {
    setSelectedBrands(prev =>
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    );
  };

  const resetFilters = () => {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setSearchQuery('');
  };

  const applyFilters = () => {
    setShowFilters(false);
    setIsLoading(true);
    fetchProducts();
  };

  const hasActiveFilters = selectedCategories.length > 0 || selectedBrands.length > 0;

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>Tortrose</Text>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>Shop</Text>
          </View>
        </View>
        <View style={styles.topBarRight}>
          <CurrencySelector />
          {!currentUser && (
            <TouchableOpacity 
              style={styles.loginButton} 
              onPress={() => navigation.navigate('Login')}
              accessibilityLabel="Login"
              accessibilityRole="button"
            >
              <Ionicons name="person-outline" size={16} color={colors.white} />
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={colors.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor={colors.grayLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            accessibilityLabel="Search products"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => { setSearchQuery(''); handleSearch(); }}
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={20} color={colors.gray} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]} 
          onPress={() => setShowFilters(true)}
          accessibilityLabel="Open filters"
          accessibilityRole="button"
        >
          <Ionicons name="options" size={22} color={colors.white} />
          {hasActiveFilters && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>
                {selectedCategories.length + selectedBrands.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Spin Banner */}
      <SpinBanner 
        spinResult={spinResult} 
        onOpenSpinner={() => navigation.navigate('SpinWheel')} 
        formatPrice={formatPrice} 
      />

      {/* Products Header */}
      <View style={styles.productsHeader}>
        <View style={styles.productsHeaderLeft}>
          <Text style={styles.productsTitle}>Products</Text>
          <TouchableOpacity 
            style={styles.browseStoresLink} 
            onPress={() => navigation.navigate('Stores')}
            accessibilityLabel="Browse stores"
            accessibilityRole="button"
          >
            <Text style={styles.browseStoresText}>Browse Stores</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.productCountContainer}>
          <Text style={styles.productCount}>{displayProducts.length} products</Text>
        </View>
      </View>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <View style={styles.activeFiltersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {selectedCategories.map(cat => (
              <TouchableOpacity 
                key={cat} 
                style={styles.activeFilterChip}
                onPress={() => toggleCategory(cat)}
              >
                <Text style={styles.activeFilterText}>{cat}</Text>
                <Ionicons name="close" size={14} color={colors.primary} />
              </TouchableOpacity>
            ))}
            {selectedBrands.map(brand => (
              <TouchableOpacity 
                key={brand} 
                style={styles.activeFilterChip}
                onPress={() => toggleBrand(brand)}
              >
                <Text style={styles.activeFilterText}>{brand}</Text>
                <Ionicons name="close" size={14} color={colors.primary} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={styles.clearFiltersButton}
              onPress={resetFilters}
            >
              <Text style={styles.clearFiltersText}>Clear All</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}
    </View>
  );

  const renderFilterModal = () => (
    <Modal 
      visible={showFilters} 
      animationType="slide" 
      transparent={true} 
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity 
              onPress={() => setShowFilters(false)}
              style={styles.modalCloseButton}
              accessibilityLabel="Close filters"
            >
              <Ionicons name="close" size={24} color={colors.dark} />
            </TouchableOpacity>
          </View>

          {/* Modal Body */}
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Categories Section */}
            <View style={styles.filterSection}>
              <View style={styles.filterSectionHeader}>
                <Ionicons name="grid-outline" size={18} color={colors.primary} />
                <Text style={styles.filterSectionTitle}>CATEGORIES</Text>
              </View>
              {categories.length === 0 ? (
                <Text style={styles.noFilterText}>No categories available</Text>
              ) : (
                <View style={styles.filterOptionsGrid}>
                  {categories.map(category => (
                    <TouchableOpacity 
                      key={category} 
                      style={[
                        styles.filterChip,
                        selectedCategories.includes(category) && styles.filterChipSelected
                      ]} 
                      onPress={() => toggleCategory(category)}
                    >
                      <Text style={[
                        styles.filterChipText,
                        selectedCategories.includes(category) && styles.filterChipTextSelected
                      ]}>
                        {category}
                      </Text>
                      {selectedCategories.includes(category) && (
                        <Ionicons name="checkmark" size={14} color={colors.white} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Brands Section */}
            <View style={styles.filterSection}>
              <View style={styles.filterSectionHeader}>
                <Ionicons name="pricetag-outline" size={18} color={colors.secondary} />
                <Text style={styles.filterSectionTitle}>BRANDS</Text>
              </View>
              {brands.length === 0 ? (
                <Text style={styles.noFilterText}>No brands available</Text>
              ) : (
                <View style={styles.filterOptionsGrid}>
                  {brands.map(brand => (
                    <TouchableOpacity 
                      key={brand} 
                      style={[
                        styles.filterChip,
                        selectedBrands.includes(brand) && styles.filterChipSelected
                      ]} 
                      onPress={() => toggleBrand(brand)}
                    >
                      <Text style={[
                        styles.filterChipText,
                        selectedBrands.includes(brand) && styles.filterChipTextSelected
                      ]}>
                        {brand}
                      </Text>
                      {selectedBrands.includes(brand) && (
                        <Ionicons name="checkmark" size={14} color={colors.white} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.resetButton} 
              onPress={resetFilters}
              accessibilityLabel="Reset filters"
            >
              <Ionicons name="refresh" size={18} color={colors.text} />
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.applyButton} 
              onPress={applyFilters}
              accessibilityLabel="Apply filters"
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
              <Ionicons name="checkmark" size={18} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="cube-outline" size={64} color={colors.grayLight} />
      </View>
      <Text style={styles.emptyTitle}>No products found</Text>
      <Text style={styles.emptySubtitle}>
        {hasActiveFilters || searchQuery 
          ? 'Try adjusting your filters or search query'
          : 'Check back later for new products'
        }
      </Text>
      {(hasActiveFilters || searchQuery) && (
        <TouchableOpacity 
          style={styles.emptyActionButton}
          onPress={() => {
            resetFilters();
            setIsLoading(true);
            fetchProducts();
          }}
        >
          <Ionicons name="refresh" size={18} color={colors.white} />
          <Text style={styles.emptyActionText}>Clear Filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Loading state with custom loader
  if (isLoading && products.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
        <Loader fullScreen size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <FlatList
        data={displayProducts}
        keyExtractor={(item) => item._id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        renderItem={({ item, index }) => (
          <ProductCard 
            product={item} 
            index={index} 
            spinResult={spinResult} 
            onPress={() => navigation.navigate('ProductDetail', { productId: item._id })} 
          />
        )}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[colors.primary]} 
            tintColor={colors.primary}
            progressBackgroundColor={colors.white}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      />
      {renderFilterModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background,
  },
  // Header styles
  headerContainer: { 
    backgroundColor: colors.white, 
    paddingBottom: spacing.md,
    ...shadows.sm,
  },
  topBar: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: spacing.lg, 
    paddingVertical: spacing.md, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.light,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logo: { 
    fontSize: fontSize.xxl, 
    fontWeight: fontWeight.bold, 
    color: colors.dark,
  },
  logoBadge: {
    backgroundColor: colors.primaryLighter,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  logoBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  topBarRight: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: spacing.sm,
  },
  loginButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary, 
    paddingHorizontal: spacing.md, 
    paddingVertical: spacing.sm, 
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  loginButtonText: { 
    color: colors.white, 
    fontWeight: fontWeight.semibold, 
    fontSize: fontSize.sm,
  },
  // Search styles
  searchContainer: { 
    flexDirection: 'row', 
    paddingHorizontal: spacing.lg, 
    paddingVertical: spacing.md, 
    gap: spacing.sm,
  },
  searchInputContainer: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.light, 
    borderRadius: borderRadius.lg, 
    paddingHorizontal: spacing.md, 
    height: 48,
  },
  searchInput: { 
    flex: 1, 
    marginLeft: spacing.sm, 
    fontSize: fontSize.md, 
    color: colors.text,
  },
  filterButton: { 
    backgroundColor: colors.primary, 
    width: 48, 
    height: 48, 
    borderRadius: borderRadius.lg, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.primaryDark,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.error,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  // Products header styles
  productsHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: spacing.lg, 
    paddingTop: spacing.md,
  },
  productsHeaderLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: spacing.md,
  },
  productsTitle: { 
    fontSize: fontSize.xxl, 
    fontWeight: fontWeight.bold, 
    color: colors.dark,
  },
  browseStoresLink: { 
    flexDirection: 'row', 
    alignItems: 'center',
  },
  browseStoresText: { 
    fontSize: fontSize.sm, 
    color: colors.primary, 
    fontWeight: fontWeight.medium,
  },
  productCountContainer: {
    backgroundColor: colors.light,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  productCount: { 
    fontSize: fontSize.sm, 
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  // Active filters styles
  activeFiltersContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLighter,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    gap: spacing.xs,
  },
  activeFilterText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  clearFiltersButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  clearFiltersText: {
    fontSize: fontSize.sm,
    color: colors.error,
    fontWeight: fontWeight.medium,
  },
  // List styles
  listContent: { 
    paddingBottom: spacing.xxl,
  },
  row: { 
    paddingHorizontal: spacing.sm, 
    gap: spacing.sm,
  },
  // Empty state styles
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingTop: 100,
    paddingHorizontal: spacing.xl,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: { 
    fontSize: fontSize.xl, 
    fontWeight: fontWeight.semibold, 
    color: colors.text, 
    marginBottom: spacing.sm,
  },
  emptySubtitle: { 
    fontSize: fontSize.md, 
    color: colors.textSecondary, 
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  emptyActionText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  // Modal styles
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    justifyContent: 'flex-end',
  },
  modalContent: { 
    backgroundColor: colors.white, 
    borderTopLeftRadius: borderRadius.xxl, 
    borderTopRightRadius: borderRadius.xxl, 
    maxHeight: '85%',
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: spacing.lg, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.light,
  },
  modalTitle: { 
    fontSize: fontSize.xl, 
    fontWeight: fontWeight.bold, 
    color: colors.dark,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: { 
    padding: spacing.lg,
  },
  filterSection: { 
    marginBottom: spacing.xl,
  },
  filterSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterSectionTitle: { 
    fontSize: fontSize.sm, 
    fontWeight: fontWeight.bold, 
    color: colors.textSecondary, 
    letterSpacing: 1,
  },
  filterOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  filterChipTextSelected: {
    color: colors.white,
  },
  noFilterText: { 
    fontSize: fontSize.md, 
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  modalFooter: { 
    flexDirection: 'row', 
    padding: spacing.lg, 
    gap: spacing.md, 
    borderTopWidth: 1, 
    borderTopColor: colors.light,
  },
  resetButton: { 
    flex: 1, 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.light, 
    paddingVertical: spacing.md, 
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  resetButtonText: { 
    fontSize: fontSize.md, 
    fontWeight: fontWeight.semibold, 
    color: colors.text,
  },
  applyButton: { 
    flex: 2, 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary, 
    paddingVertical: spacing.md, 
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    ...shadows.md,
  },
  applyButtonText: { 
    fontSize: fontSize.md, 
    fontWeight: fontWeight.semibold, 
    color: colors.white,
  },
});
