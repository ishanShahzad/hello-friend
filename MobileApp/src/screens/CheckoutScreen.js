import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { API_BASE_URL } from '../config/api';
import { useGlobal } from '../contexts/GlobalContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { colors, spacing, fontSize, borderRadius, shadows } from '../styles/theme';

export default function CheckoutScreen({ navigation }) {
  const { cartItems, fetchCart } = useGlobal();
  const { formatPrice } = useCurrency();
  
  const [isProcessing, setIsProcessing] = useState(false);
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

  // Calculate totals
  const subtotal = cartItems.cart.reduce((total, item) => {
    return total + (item.product.price * item.quantity);
  }, 0);
  
  const shippingCost = 50; // Fixed shipping for now
  const tax = subtotal * 0.05; // 5% tax
  const totalAmount = subtotal + shippingCost + tax;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const required = ['fullName', 'email', 'phone', 'address', 'city', 'state', 'postalCode'];
    for (let field of required) {
      if (!formData[field]) {
        Toast.show({
          type: 'error',
          text1: 'Missing Information',
          text2: `Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`
        });
        return false;
      }
    }
    
    // Email validation
    const emailRegex = /^\S+@\S+$/i;
    if (!emailRegex.test(formData.email)) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Email',
        text2: 'Please enter a valid email address'
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
          image: item.product.image,
          price: item.product.price,
          quantity: item.quantity,
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
        navigation.navigate('Orders');
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

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Cart Items Review */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items ({cartItems.cart.length})</Text>
          {cartItems.cart.map((item, index) => (
            <View key={index} style={styles.cartItem}>
              <Image
                source={{ uri: item.product.image || 'https://via.placeholder.com/60' }}
                style={styles.cartItemImage}
              />
              <View style={styles.cartItemInfo}>
                <Text style={styles.cartItemName} numberOfLines={2}>
                  {item.product.name}
                </Text>
                <Text style={styles.cartItemQuantity}>Qty: {item.quantity}</Text>
                <Text style={styles.cartItemPrice}>
                  {formatPrice(item.product.price)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping Information</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={formData.fullName}
            onChangeText={(value) => handleInputChange('fullName', value)}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={formData.email}
            onChangeText={(value) => handleInputChange('email', value)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Phone"
            value={formData.phone}
            onChangeText={(value) => handleInputChange('phone', value)}
            keyboardType="phone-pad"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Address"
            value={formData.address}
            onChangeText={(value) => handleInputChange('address', value)}
            multiline
          />
          
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="City"
              value={formData.city}
              onChangeText={(value) => handleInputChange('city', value)}
            />
            
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="State"
              value={formData.state}
              onChangeText={(value) => handleInputChange('state', value)}
            />
          </View>
          
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Postal Code"
              value={formData.postalCode}
              onChangeText={(value) => handleInputChange('postalCode', value)}
              keyboardType="numeric"
            />
            
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Country"
              value={formData.country}
              onChangeText={(value) => handleInputChange('country', value)}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal:</Text>
            <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping:</Text>
            <Text style={styles.summaryValue}>{formatPrice(shippingCost)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax:</Text>
            <Text style={styles.summaryValue}>{formatPrice(tax)}</Text>
          </View>
          
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>{formatPrice(totalAmount)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.placeOrderButton, isProcessing && styles.buttonDisabled]}
          onPress={handlePlaceOrder}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.placeOrderText}>Place Order</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: colors.white,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.light,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
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
    color: colors.dark,
  },
  totalRow: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.dark,
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.primary,
  },
  footer: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  placeOrderButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  placeOrderText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: 'bold',
  },
  cartItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cartItemImage: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.sm,
  },
  cartItemInfo: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  cartItemName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: spacing.xs,
  },
  cartItemQuantity: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  cartItemPrice: {
    fontSize: fontSize.sm,
    fontWeight: 'bold',
    color: colors.primary,
  },
});
