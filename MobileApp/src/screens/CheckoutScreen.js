/**
 * CheckoutScreen
 * Modern checkout screen with shipping form and order summary
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../config/api';
import { useGlobal } from '../contexts/GlobalContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { Loader, InlineLoader } from '../components/common';
import { 
  colors, 
  spacing, 
  fontSize, 
  borderRadius, 
  shadows,
  fontWeight,
} from '../styles/theme';

export default function CheckoutScreen({ navigation }) {
  const { cartItems, fetchCart, spinResult } = useGlobal();
  const { formatPrice } = useCurrency();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'Pakistan',
  });

  // Get discounted price for a product
  const getDiscountedPrice = (product) => {
    if (!product) return 0;
    
    if (!spinResult || spinResult.hasCheckedOut) {
      return product.discountedPrice || product.price;
    }

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

  // Calculate totals
  const subtotal = cartItems?.cart?.reduce((total, item) => {
    const price = getDiscountedPrice(item.product);
    return total + (price * (item.qty || item.quantity || 1));
  }, 0) || 0;
  
  const shippingCost = 50; // Fixed shipping for now
  const tax = subtotal * 0.05; // 5% tax
  const totalAmount = subtotal + shippingCost + tax;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const required = ['fullName', 'email', 'phone', 'address', 'city', 'state', 'postalCode'];
    
    for (let field of required) {
      if (!formData[field]?.trim()) {
        newErrors[field] = `${field.replace(/([A-Z])/g, ' $1').trim()} is required`;
      }
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation
    const phoneDigits = formData.phone?.replace(/[\s\-\(\)\+]/g, '') || '';
    if (formData.phone && (phoneDigits.length < 10 || !/^\d+$/.test(phoneDigits))) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      Toast.show({
        type: 'error',
        text1: 'Missing Information',
        text2: 'Please fill in all required fields correctly',
      });
      return false;
    }
    
    return true;
  };

  const handlePlaceOrder = async () => {
    if (!validateForm()) return;
    
    setIsProcessing(true);
    
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      
      const order = {
        orderItems: cartItems.cart.map(item => ({
          id: item.product._id,
          name: item.product.name,
          image: item.product.image || item.product.images?.[0]?.url,
          price: getDiscountedPrice(item.product),
          quantity: item.qty || item.quantity || 1,
        })),
        shippingInfo: formData,
        shippingMethod: {
          name: 'standard',
          price: shippingCost,
          estimatedDays: 5
        },
        orderSummary: {
          subtotal,
          shippingCost,
          tax,
          totalAmount,
        },
        paymentMethod: 'cash_on_delivery',
      };

      const res = await axios.post(
        `${API_BASE_URL}/api/order/place`,
        { order },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Toast.show({
        type: 'success',
        text1: 'Order Placed!',
        text2: res.data.msg || 'Your order has been placed successfully'
      });

      // Clear cart
      await axios.delete(`${API_BASE_URL}/api/cart/clear`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      fetchCart();
      
      // Navigate to orders screen
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }, { name: 'Orders' }],
        });
      }, 1500);
      
    } catch (error) {
      console.error('Order placement error:', error);
      Toast.show({
        type: 'error',
        text1: 'Order Failed',
        text2: error.response?.data?.msg || 'Failed to place order'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderInput = (field, placeholder, options = {}) => {
    const hasError = !!errors[field];
    return (
      <View style={[styles.inputGroup, options.halfWidth && styles.halfInput]}>
        <View style={[styles.inputContainer, hasError && styles.inputContainerError]}>
          {options.icon && (
            <Ionicons 
              name={options.icon} 
              size={18} 
              color={hasError ? colors.error : colors.gray} 
              style={styles.inputIcon}
            />
          )}
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={colors.grayLight}
            value={formData[field]}
            onChangeText={(value) => handleInputChange(field, value)}
            keyboardType={options.keyboardType || 'default'}
            autoCapitalize={options.autoCapitalize || 'sentences'}
            multiline={options.multiline}
            numberOfLines={options.numberOfLines}
            accessibilityLabel={placeholder}
          />
        </View>
        {hasError && (
          <Text style={styles.errorText}>{errors[field]}</Text>
        )}
      </View>
    );
  };

  if (!cartItems?.cart || cartItems.cart.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={64} color={colors.grayLight} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <TouchableOpacity 
            style={styles.shopButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.shopButtonText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Order Items Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bag-outline" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Order Items</Text>
              <View style={styles.itemCountBadge}>
                <Text style={styles.itemCountText}>{cartItems.cart.length}</Text>
              </View>
            </View>
            
            {cartItems.cart.map((item, index) => {
              const price = getDiscountedPrice(item.product);
              const originalPrice = item.product?.discountedPrice || item.product?.price;
              const hasDiscount = price < originalPrice;
              
              return (
                <View key={index} style={styles.cartItem}>
                  <Image
                    source={{ uri: item.product?.image || item.product?.images?.[0]?.url }}
                    style={styles.cartItemImage}
                  />
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName} numberOfLines={2}>
                      {item.product?.name}
                    </Text>
                    <Text style={styles.cartItemQuantity}>
                      Qty: {item.qty || item.quantity || 1}
                    </Text>
                  </View>
                  <View style={styles.cartItemPriceContainer}>
                    <Text style={[styles.cartItemPrice, hasDiscount && styles.discountedPrice]}>
                      {formatPrice(price)}
                    </Text>
                    {hasDiscount && (
                      <Text style={styles.originalPrice}>{formatPrice(originalPrice)}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Shipping Information Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location-outline" size={20} color={colors.secondary} />
              <Text style={styles.sectionTitle}>Shipping Information</Text>
            </View>
            
            {renderInput('fullName', 'Full Name', { icon: 'person-outline' })}
            {renderInput('email', 'Email Address', { 
              icon: 'mail-outline', 
              keyboardType: 'email-address',
              autoCapitalize: 'none',
            })}
            {renderInput('phone', 'Phone Number', { 
              icon: 'call-outline', 
              keyboardType: 'phone-pad',
            })}
            {renderInput('address', 'Street Address', { 
              icon: 'home-outline',
              multiline: true,
              numberOfLines: 2,
            })}
            
            <View style={styles.row}>
              {renderInput('city', 'City', { halfWidth: true })}
              {renderInput('state', 'State/Province', { halfWidth: true })}
            </View>
            
            <View style={styles.row}>
              {renderInput('postalCode', 'Postal Code', { 
                halfWidth: true,
                keyboardType: 'numeric',
              })}
              {renderInput('country', 'Country', { halfWidth: true })}
            </View>
          </View>

          {/* Payment Method Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="card-outline" size={20} color={colors.info} />
              <Text style={styles.sectionTitle}>Payment Method</Text>
            </View>
            
            <View style={styles.paymentOption}>
              <View style={styles.paymentRadio}>
                <View style={styles.paymentRadioInner} />
              </View>
              <Ionicons name="cash-outline" size={24} color={colors.success} />
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentTitle}>Cash on Delivery</Text>
                <Text style={styles.paymentSubtitle}>Pay when you receive</Text>
              </View>
            </View>
          </View>

          {/* Order Summary Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="receipt-outline" size={20} color={colors.warning} />
              <Text style={styles.sectionTitle}>Order Summary</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping</Text>
              <Text style={styles.summaryValue}>{formatPrice(shippingCost)}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax (5%)</Text>
              <Text style={styles.summaryValue}>{formatPrice(tax)}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatPrice(totalAmount)}</Text>
            </View>
          </View>

          {/* Spacer for footer */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerTotal}>
            <Text style={styles.footerTotalLabel}>Total</Text>
            <Text style={styles.footerTotalValue}>{formatPrice(totalAmount)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.placeOrderButton, isProcessing && styles.buttonDisabled]}
            onPress={handlePlaceOrder}
            disabled={isProcessing}
            accessibilityLabel="Place order"
            accessibilityRole="button"
          >
            {isProcessing ? (
              <InlineLoader size="small" color={colors.white} />
            ) : (
              <>
                <Text style={styles.placeOrderText}>Place Order</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.white} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  // Section styles
  section: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.dark,
    flex: 1,
  },
  itemCountBadge: {
    backgroundColor: colors.primaryLighter,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  itemCountText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  // Cart item styles
  cartItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
  },
  cartItemImage: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    backgroundColor: colors.light,
  },
  cartItemInfo: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  cartItemName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.dark,
    marginBottom: spacing.xs,
  },
  cartItemQuantity: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  cartItemPriceContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  cartItemPrice: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  discountedPrice: {
    color: '#f59e0b',
  },
  originalPrice: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  // Input styles
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lighter,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.light,
    paddingHorizontal: spacing.md,
  },
  inputContainerError: {
    borderColor: colors.error,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
    marginLeft: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  // Payment styles
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lighter,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    gap: spacing.md,
  },
  paymentRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  paymentSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  // Summary styles
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  divider: {
    height: 1,
    backgroundColor: colors.light,
    marginVertical: spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.dark,
  },
  totalValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  // Footer styles
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.light,
    ...shadows.lg,
    gap: spacing.lg,
  },
  footerTotal: {
    flex: 1,
  },
  footerTotalLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  footerTotalValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  placeOrderButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  placeOrderText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  shopButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  shopButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
