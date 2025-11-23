import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCurrency } from '../contexts/CurrencyContext';
import { useGlobal } from '../contexts/GlobalContext';
import { colors, spacing, fontSize, borderRadius, shadows } from '../styles/theme';

const { width } = Dimensions.get('window');
const cardWidth = (width - spacing.md * 3) / 2;

export default function ProductCard({ product, onPress }) {
  const { formatPrice } = useCurrency();
  const { handleAddToCart, handleAddToWishlist, cartItems, wishlistItems, loadingProductId } = useGlobal();

  const isInCart = cartItems?.cart?.some(item => item?.product?._id === product._id);
  const isInWishlist = wishlistItems?.some(item => item._id === product._id);
  const isLoading = loadingProductId === product._id;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <Image
        source={{ uri: product.image || 'https://via.placeholder.com/150' }}
        style={styles.image}
        resizeMode="cover"
      />
      
      <TouchableOpacity
        style={styles.wishlistButton}
        onPress={() => handleAddToWishlist(product._id)}
      >
        <Ionicons
          name={isInWishlist ? 'heart' : 'heart-outline'}
          size={20}
          color={isInWishlist ? colors.danger : colors.gray}
        />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        
        <Text style={styles.price}>
          {formatPrice(product.price)}
        </Text>

        <TouchableOpacity
          style={[
            styles.addButton,
            isInCart && styles.addButtonActive,
            isLoading && styles.addButtonDisabled
          ]}
          onPress={() => handleAddToCart(product._id)}
          disabled={isLoading}
        >
          <Ionicons
            name={isInCart ? 'checkmark' : 'cart-outline'}
            size={16}
            color={colors.white}
          />
          <Text style={styles.addButtonText}>
            {isInCart ? 'In Cart' : 'Add'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: cardWidth,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    margin: spacing.sm,
    ...shadows.md,
  },
  image: {
    width: '100%',
    height: cardWidth * 0.8,
    borderTopLeftRadius: borderRadius.md,
    borderTopRightRadius: borderRadius.md,
  },
  wishlistButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.round,
    padding: spacing.sm,
    ...shadows.sm,
  },
  content: {
    padding: spacing.sm,
  },
  name: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: spacing.xs,
  },
  price: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  addButtonActive: {
    backgroundColor: colors.success,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },
});
