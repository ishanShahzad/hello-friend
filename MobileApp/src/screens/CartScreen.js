/**
 * CartScreen
 * Modern cart screen with item management and checkout
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useGlobal } from '../contexts/GlobalContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { Loader, InlineLoader, EmptyCart, LoginRequired } from '../components/common';
import { colors, spacing, fontSize, borderRadius, shadows, fontWeight } from '../styles/theme';

export default function CartScreen({ navigation }) {
  const { currentUser } = useAuth();
  const {
    cartItems,
    fetchCart,
    handleRemoveCartItem,
    handleQtyInc,
    handleQtyDec,
    isCartLoading,
    qtyUpdateId,
    spinResult,
  } = useGlobal();
  const { formatPrice } = useCurrency();

  useEffect(() => {
    if (currentUser) {
      fetchCart();
    }
  }, [currentUser]);

  // Calculate discounted price for a product
  const getDiscountedPrice = (product) => {
    if (!product) return 0;
    
    if (!spinResult || spinResult.hasCheckedOut) {
      return product.discountedPrice || product.price;
    }

    // Check if product is in spin selected products
    const spinSelectedProducts = spinResult.selectedProducts || [];
    if (!spinSelectedProducts.includes(product._id)) {
      return product.discountedPrice || product.price;
    }

    let discountedPrice = product.price;
    const type = spinResult.type || spinResult.discountType;
    const value = spinResult.value || spinResult.discount;

    if (type === 'free') {
      discountedPrice = 0;
    } else if (type === 'fixed') {
      discountedPrice = value;
    } else if (type === 'percentage') {
      discountedPrice = product.price * (1 - value / 100);
    }

    return Math.max(0, discountedPrice);
  };

  // Calculate subtotal
  const calculateSubtotal = () => {
    if (!cartItems?.cart) return 0;
    return cartItems.cart.reduce((total, item) => {
      if (!item.product) return total;
      const itemPrice = getDiscountedPrice(item.product);
      return total + (itemPrice * item.qty);
    }, 0);
  };

  const handleCheckout = () => {
    if (!currentUser) {
      navigation.navigate('Login');
      return;
    }
    if (!cartItems?.cart || cartItems.cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to your cart before checkout');
      return;
    }
    navigation.navigate('Checkout');
  };

  // Guest View
  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Cart</Text>
        </View>
        <LoginRequired 
          onAction={() => navigation.navigate('Login')}
          style={styles.emptyStateContainer}
        />
      </SafeAreaView>
    );
  }

  // Empty Cart
  if (!cartItems?.cart || cartItems.cart.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Cart</Text>
        </View>
        <EmptyCart 
          onAction={() => navigation.navigate('Home')}
          style={styles.emptyStateContainer}
        />
      </SafeAreaView>
    );
  }

  const renderCartItem = ({ item }) => {
    const { product, qty, _id: itemId } = item;
    
    if (!product) return null;

    const discountedPrice = getDiscountedPrice(product);
    const originalPrice = product.discountedPrice || product.price;
    const hasDiscount = discountedPrice < originalPrice;
    const isUpdating = qtyUpdateId === itemId;

    return (
      <View style={styles.cartItem}>
        {isUpdating && (
          <View style={styles.itemOverlay}>
            <InlineLoader size="small" />
            <Text style={styles.overlayText}>Updating...</Text>
          </View>
        )}
        
        <Image
          source={{ uri: product.image || product.images?.[0]?.url }}
          style={styles.itemImage}
          resizeMode="cover"
        />
        
        <View style={styles.itemDetails}>
          <Text style={styles.itemName} numberOfLines={2}>{product.name}</Text>
          
          {/* Quantity Selector */}
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={styles.qtyButton}
              onPress={() => handleQtyDec(itemId)}
              disabled={isUpdating}
            >
              <Ionicons name="remove" size={18} color={colors.gray} />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{qty}</Text>
            <TouchableOpacity
              style={[styles.qtyButton, styles.qtyButtonDisabled]}
              onPress={() => handleQtyInc(itemId)}
              disabled={true}
            >
              <Ionicons name="add" size={18} color={colors.grayLight} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.itemPriceContainer}>
          <Text style={[styles.itemPrice, hasDiscount && styles.itemPriceDiscount]}>
            {formatPrice(discountedPrice)}
          </Text>
          {hasDiscount && (
            <Text style={styles.itemOriginalPrice}>{formatPrice(originalPrice)}</Text>
          )}
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveCartItem(product._id)}
            disabled={isUpdating}
          >
            <Ionicons name="close" size={20} color={colors.gray} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Cart</Text>
        <Text style={styles.itemCount}>{cartItems.cart.length} items</Text>
      </View>

      {isCartLoading && cartItems.cart.length === 0 ? (
        <Loader fullScreen size="medium" />
      ) : (
        <FlatList
          data={cartItems.cart}
          keyExtractor={(item) => item._id}
          renderItem={renderCartItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.subtotalContainer}>
          <Text style={styles.subtotalLabel}>Subtotal</Text>
          <Text style={styles.subtotalValue}>{formatPrice(calculateSubtotal())}</Text>
        </View>
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={handleCheckout}
          disabled={isCartLoading}
        >
          <Text style={styles.checkoutButtonText}>Checkout</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  itemCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateContainer: {
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
    position: 'relative',
  },
  itemOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    zIndex: 10,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  overlayText: {
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: borderRadius.md,
    backgroundColor: colors.light,
  },
  itemDetails: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lighter,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  qtyButton: {
    padding: spacing.xs,
  },
  qtyButtonDisabled: {
    opacity: 0.4,
  },
  qtyText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    paddingHorizontal: spacing.md,
  },
  itemPriceContainer: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  itemPrice: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  itemPriceDiscount: {
    color: '#f59e0b',
  },
  itemOriginalPrice: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  removeButton: {
    padding: spacing.xs,
  },
  footer: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.light,
    ...shadows.lg,
  },
  subtotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  subtotalLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  subtotalValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  checkoutButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkoutButtonText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  // Empty states
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  loginButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxxl,
    borderRadius: borderRadius.lg,
  },
  loginButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  shopButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxxl,
    borderRadius: borderRadius.lg,
  },
  shopButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
