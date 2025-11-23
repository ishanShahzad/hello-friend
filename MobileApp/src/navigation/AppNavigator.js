import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useGlobal } from '../contexts/GlobalContext';
import { View, Text, StyleSheet } from 'react-native';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Main Screens
import HomeScreen from '../screens/HomeScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import StoreScreen from '../screens/StoreScreen';
import StoresListingScreen from '../screens/StoresListingScreen';
import CartScreen from '../screens/CartScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import OrdersScreen from '../screens/OrdersScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import WishlistScreen from '../screens/WishlistScreen';

// Admin Screens
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminUserManagementScreen from '../screens/admin/AdminUserManagementScreen';
import AdminTaxConfigurationScreen from '../screens/admin/AdminTaxConfigurationScreen';

// Seller Screens
import SellerDashboardScreen from '../screens/seller/SellerDashboardScreen';
import SellerStoreSettingsScreen from '../screens/seller/SellerStoreSettingsScreen';
import SellerShippingConfigurationScreen from '../screens/seller/SellerShippingConfigurationScreen';

// Shared Screens
import ProductManagementScreen from '../screens/shared/ProductManagementScreen';
import ProductFormScreen from '../screens/shared/ProductFormScreen';
import OrderManagementScreen from '../screens/shared/OrderManagementScreen';
import OrderDetailManagementScreen from '../screens/shared/OrderDetailManagementScreen';
import StoreOverviewScreen from '../screens/shared/StoreOverviewScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Cart Badge Component
function CartBadge({ count }) {
  if (count === 0) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
    </View>
  );
}

// Bottom Tab Navigator for main app
function MainTabs() {
  const { cartItems } = useGlobal();
  const cartCount = cartItems?.cart?.length || 0;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Stores') {
            iconName = focused ? 'storefront' : 'storefront-outline';
          } else if (route.name === 'Cart') {
            iconName = focused ? 'cart' : 'cart-outline';
          } else if (route.name === 'Wishlist') {
            iconName = focused ? 'heart' : 'heart-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return (
            <View>
              <Ionicons name={iconName} size={size} color={color} />
              {route.name === 'Cart' && <CartBadge count={cartCount} />}
            </View>
          );
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Stores" component={StoresListingScreen} />
      <Tab.Screen name="Cart" component={CartScreen} />
      <Tab.Screen name="Wishlist" component={WishlistScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Main App Navigator
export default function AppNavigator() {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return null; // Or a loading screen
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {!currentUser ? (
        // Auth Stack
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SignUp"
            component={SignUpScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
            options={{ title: 'Forgot Password' }}
          />
        </>
      ) : (
        // Main App Stack
        <>
          <Stack.Screen
            name="MainTabs"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ProductDetail"
            component={ProductDetailScreen}
            options={{ title: 'Product Details' }}
          />
          <Stack.Screen
            name="Store"
            component={StoreScreen}
            options={{ title: 'Store' }}
          />
          <Stack.Screen
            name="Checkout"
            component={CheckoutScreen}
            options={{ title: 'Checkout' }}
          />
          <Stack.Screen
            name="Orders"
            component={OrdersScreen}
            options={{ title: 'My Orders' }}
          />
          <Stack.Screen
            name="OrderDetail"
            component={OrderDetailScreen}
            options={{ title: 'Order Details' }}
          />

          {/* Admin Dashboard */}
          <Stack.Screen
            name="AdminDashboard"
            component={AdminDashboardScreen}
            options={{ title: 'Admin Dashboard' }}
          />
          <Stack.Screen
            name="AdminStoreOverview"
            component={StoreOverviewScreen}
            initialParams={{ isAdmin: true }}
            options={{ title: 'Store Overview' }}
          />
          <Stack.Screen
            name="AdminProductManagement"
            component={ProductManagementScreen}
            initialParams={{ isAdmin: true }}
            options={{ title: 'Product Management' }}
          />
          <Stack.Screen
            name="AdminOrderManagement"
            component={OrderManagementScreen}
            initialParams={{ isAdmin: true }}
            options={{ title: 'Order Management' }}
          />
          <Stack.Screen
            name="AdminUserManagement"
            component={AdminUserManagementScreen}
            options={{ title: 'User Management' }}
          />
          <Stack.Screen
            name="AdminTaxConfiguration"
            component={AdminTaxConfigurationScreen}
            options={{ title: 'Tax Configuration' }}
          />

          {/* Seller Dashboard */}
          <Stack.Screen
            name="SellerDashboard"
            component={SellerDashboardScreen}
            options={{ title: 'Seller Dashboard' }}
          />
          <Stack.Screen
            name="SellerStoreOverview"
            component={StoreOverviewScreen}
            initialParams={{ isAdmin: false }}
            options={{ title: 'Store Overview' }}
          />
          <Stack.Screen
            name="SellerProductManagement"
            component={ProductManagementScreen}
            initialParams={{ isAdmin: false }}
            options={{ title: 'Product Management' }}
          />
          <Stack.Screen
            name="SellerOrderManagement"
            component={OrderManagementScreen}
            initialParams={{ isAdmin: false }}
            options={{ title: 'Order Management' }}
          />
          <Stack.Screen
            name="SellerStoreSettings"
            component={SellerStoreSettingsScreen}
            options={{ title: 'Store Settings' }}
          />
          <Stack.Screen
            name="SellerShippingConfiguration"
            component={SellerShippingConfigurationScreen}
            options={{ title: 'Shipping Configuration' }}
          />

          {/* Shared Screens */}
          <Stack.Screen
            name="ProductForm"
            component={ProductFormScreen}
            options={{ title: 'Product Form' }}
          />
          <Stack.Screen
            name="OrderDetailManagement"
            component={OrderDetailManagementScreen}
            options={{ title: 'Order Details' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -8,
    top: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
