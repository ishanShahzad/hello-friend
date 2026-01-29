import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import SpinWheel from '../components/SpinWheel';
import SpinBanner from '../components/SpinBanner';
import { colors, spacing, fontSize, borderRadius, shadows } from '../styles/theme';

export default function SpinWheelScreen({ navigation }) {
  const { currentUser } = useAuth();
  const [spinResult, setSpinResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [canSpin, setCanSpin] = useState(true);
  const [cooldownTime, setCooldownTime] = useState('');

  // Fetch active spin result
  const fetchActiveSpin = useCallback(async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    try {
      const token = await AsyncStorage.getItem('jwtToken');
      const response = await axios.get(
        `${API_BASE_URL}/api/spin/get-active`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.hasActiveSpin) {
        setSpinResult(response.data.spinResult);
        setCanSpin(false);
        
        // Calculate cooldown
        const expiresAt = new Date(response.data.spinResult.expiresAt);
        const now = new Date();
        if (expiresAt > now) {
          const diff = expiresAt - now;
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          setCooldownTime(`${hours}h ${minutes}m`);
        }
      } else {
        setSpinResult(null);
        setCanSpin(true);
      }
    } catch (error) {
      console.log('Error fetching active spin:', error.message);
      // Check local storage as fallback
      const localSpinResult = await AsyncStorage.getItem('spinResult');
      if (localSpinResult) {
        const parsed = JSON.parse(localSpinResult);
        const expiresAt = new Date(parsed.expiresAt);
        if (expiresAt > new Date()) {
          setSpinResult(parsed);
          setCanSpin(false);
        } else {
          await AsyncStorage.removeItem('spinResult');
          setCanSpin(true);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchActiveSpin();
  }, [fetchActiveSpin]);

  // Update cooldown timer
  useEffect(() => {
    if (!spinResult?.expiresAt) return;

    const updateCooldown = () => {
      const expiresAt = new Date(spinResult.expiresAt);
      const now = new Date();
      const diff = expiresAt - now;

      if (diff <= 0) {
        setCanSpin(true);
        setCooldownTime('');
        setSpinResult(null);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setCooldownTime(`${hours}h ${minutes}m`);
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 60000);
    return () => clearInterval(interval);
  }, [spinResult]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchActiveSpin();
    setRefreshing(false);
  }, [fetchActiveSpin]);

  const handleSpinComplete = async (result) => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      
      // Save to backend
      const response = await axios.post(
        `${API_BASE_URL}/api/spin/save-result`,
        {
          discount: result.value,
          discountType: result.type,
          label: result.label
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const savedResult = response.data.spinResult;
      setSpinResult(savedResult);
      setCanSpin(false);

      // Save to local storage as backup
      await AsyncStorage.setItem('spinResult', JSON.stringify(savedResult));
      await AsyncStorage.setItem('spinTimestamp', Date.now().toString());

      Toast.show({
        type: 'success',
        text1: '🎉 Congratulations!',
        text2: `You won: ${result.label}`
      });
    } catch (error) {
      console.error('Error saving spin result:', error);
      
      if (error.response?.status === 400) {
        Toast.show({
          type: 'info',
          text1: 'Already Spun',
          text2: error.response.data.msg || 'You have already spun today!'
        });
        
        if (error.response.data.existingSpin) {
          setSpinResult(error.response.data.existingSpin);
          setCanSpin(false);
        }
      } else {
        // Save locally even if API fails
        const localResult = {
          ...result,
          discount: result.value,
          discountType: result.type,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          selectedProducts: [],
          hasCheckedOut: false
        };
        setSpinResult(localResult);
        setCanSpin(false);
        await AsyncStorage.setItem('spinResult', JSON.stringify(localResult));
        
        Toast.show({
          type: 'warning',
          text1: 'Saved Locally',
          text2: 'Your spin was saved locally. It will sync when online.'
        });
      }
    }
  };

  const handleOpenSpinner = () => {
    if (!currentUser) {
      Toast.show({
        type: 'info',
        text1: 'Login Required',
        text2: 'Please login to spin the wheel'
      });
      navigation.navigate('Login');
      return;
    }

    if (!canSpin) {
      Toast.show({
        type: 'info',
        text1: 'Cooldown Active',
        text2: `You can spin again in ${cooldownTime}`
      });
      return;
    }

    setShowSpinWheel(true);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="gift" size={40} color={colors.white} />
        <Text style={styles.headerTitle}>Spin & Win</Text>
        <Text style={styles.headerSubtitle}>
          Win amazing discounts up to 100% OFF!
        </Text>
      </View>

      {/* Spin Banner */}
      <View style={styles.content}>
        <SpinBanner
          spinResult={spinResult}
          selectedCount={spinResult?.selectedProducts?.length || 0}
          onOpenSpinner={handleOpenSpinner}
        />

        {/* How It Works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          
          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Spin the Wheel</Text>
              <Text style={styles.stepDescription}>
                Tap the spin button to try your luck and win exclusive discounts!
              </Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Select Products</Text>
              <Text style={styles.stepDescription}>
                Choose up to 3 products to apply your discount to.
              </Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Checkout & Win</Text>
              <Text style={styles.stepDescription}>
                Complete your purchase to enter the winner's draw!
              </Text>
            </View>
          </View>
        </View>

        {/* Prizes Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Prizes</Text>
          
          <View style={styles.prizesGrid}>
            <View style={[styles.prizeCard, { backgroundColor: '#ef4444' }]}>
              <Text style={styles.prizeValue}>40%</Text>
              <Text style={styles.prizeLabel}>OFF</Text>
            </View>
            <View style={[styles.prizeCard, { backgroundColor: '#10b981' }]}>
              <Text style={styles.prizeValue}>FREE</Text>
              <Text style={styles.prizeLabel}>Products</Text>
            </View>
            <View style={[styles.prizeCard, { backgroundColor: '#3b82f6' }]}>
              <Text style={styles.prizeValue}>60%</Text>
              <Text style={styles.prizeLabel}>OFF</Text>
            </View>
            <View style={[styles.prizeCard, { backgroundColor: '#eab308' }]}>
              <Text style={styles.prizeValue}>$0.99</Text>
              <Text style={styles.prizeLabel}>Each</Text>
            </View>
            <View style={[styles.prizeCard, { backgroundColor: '#a855f7' }]}>
              <Text style={styles.prizeValue}>80%</Text>
              <Text style={styles.prizeLabel}>OFF</Text>
            </View>
            <View style={[styles.prizeCard, { backgroundColor: '#ec4899' }]}>
              <Text style={styles.prizeValue}>99%</Text>
              <Text style={styles.prizeLabel}>OFF</Text>
            </View>
          </View>
        </View>

        {/* Spin Button */}
        {canSpin && (
          <TouchableOpacity 
            style={styles.spinButton}
            onPress={handleOpenSpinner}
          >
            <Ionicons name="flash" size={24} color={colors.white} />
            <Text style={styles.spinButtonText}>SPIN NOW</Text>
          </TouchableOpacity>
        )}

        {!canSpin && cooldownTime && (
          <View style={styles.cooldownContainer}>
            <Ionicons name="time" size={24} color={colors.textSecondary} />
            <Text style={styles.cooldownText}>
              Next spin available in: <Text style={styles.cooldownTime}>{cooldownTime}</Text>
            </Text>
          </View>
        )}
      </View>

      {/* Spin Wheel Modal */}
      <SpinWheel
        visible={showSpinWheel}
        onClose={() => setShowSpinWheel(false)}
        onSpinComplete={handleSpinComplete}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
  },
  header: {
    backgroundColor: '#9333ea',
    padding: spacing.xl,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.white,
    marginTop: spacing.sm,
  },
  headerSubtitle: {
    fontSize: fontSize.md,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  content: {
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#9333ea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  stepNumberText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: fontSize.md,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  stepDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  prizesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  prizeCard: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  prizeValue: {
    fontSize: fontSize.xl,
    fontWeight: '900',
    color: colors.white,
  },
  prizeLabel: {
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  spinButton: {
    flexDirection: 'row',
    backgroundColor: '#9333ea',
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.md,
  },
  spinButtonText: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: '900',
  },
  cooldownContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.light,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  cooldownText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  cooldownTime: {
    fontWeight: 'bold',
    color: '#9333ea',
  },
});
