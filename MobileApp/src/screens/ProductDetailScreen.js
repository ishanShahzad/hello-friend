import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { useCurrency } from '../contexts/CurrencyContext';
import { useGlobal } from '../contexts/GlobalContext';
import { colors, spacing, fontSize, borderRadius, shadows } from '../styles/theme';

export default function ProductDetailScreen({ route, navigation }) {
  const { productId } = route.params;
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const { formatPrice } = useCurrency();
  const { handleAddToCart, handleAddToWishlist, cartItems, wishlistItems, loadingProductId } = useGlobal();

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/products/get-single-product/${productId}`);
      setProduct(res.data.product);
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.centerContainer}>
        <Text>Product not found</Text>
      </View>
    );
  }

  const isInCart = cartItems?.cart?.some(item => item?.product?._id === product._id);
  const isInWishlist = wishlistItems?.some(item => item._id === product._id);
  const isAddingToCart = loadingProductId === product._id;

  return (
    <View style={styles.container}>
      <ScrollView>
        <Image
          source={{ uri: product.image || 'https://via.placeholder.com/400' }}
          style={styles.image}
          resizeMode="cover"
        />

        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.name}>{product.name}</Text>
            <TouchableOpacity
              style={styles.wishlistButton}
              onPress={() => handleAddToWishlist(product._id)}
            >
              <Ionicons
                name={isInWishlist ? 'heart' : 'heart-outline'}
                size={28}
                color={isInWishlist ? colors.danger : colors.gray}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.price}>{formatPrice(product.price)}</Text>

          {product.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          )}

          {product.category && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Category</Text>
              <Text style={styles.categoryText}>{product.category}</Text>
            </View>
          )}

          {product.stock !== undefined && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Availability</Text>
              <Text style={[styles.stockText, product.stock > 0 ? styles.inStock : styles.outOfStock]}>
                {product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.addToCartButton,
            isInCart && styles.addToCartButtonActive,
            isAddingToCart && styles.addToCartButtonDisabled
          ]}
          onPress={() => handleAddToCart(product._id)}
          disabled={isAddingToCart}
        >
          {isAddingToCart ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons
                name={isInCart ? 'checkmark-circle' : 'cart'}
                size={24}
                color={colors.white}
              />
              <Text style={styles.addToCartText}>
                {isInCart ? 'In Cart' : 'Add to Cart'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: 300,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  name: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.dark,
    marginRight: spacing.md,
  },
  wishlistButton: {
    padding: spacing.xs,
  },
  price: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  categoryText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  stockText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  inStock: {
    color: colors.success,
  },
  outOfStock: {
    color: colors.danger,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.md,
  },
  addToCartButtonActive: {
    backgroundColor: colors.success,
  },
  addToCartButtonDisabled: {
    opacity: 0.6,
  },
  addToCartText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
  },
});
