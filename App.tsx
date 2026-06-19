import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Context Providers
import { ToastProvider } from './src/presentation/context/ToastContext';
import { AuthProvider, useAuth } from './src/presentation/context/AuthContext';
import { DeliveryProvider } from './src/presentation/context/DeliveryContext';

// Screens
import { SignInScreen } from './src/presentation/screens/SignInScreen';
import { KycScreen } from './src/presentation/screens/KycScreen';
import { DashboardScreen } from './src/presentation/screens/DashboardScreen';
import { ActiveDeliveryScreen } from './src/presentation/screens/ActiveDeliveryScreen';
import { EarningsScreen } from './src/presentation/screens/EarningsScreen';
import { ProfileScreen } from './src/presentation/screens/ProfileScreen';
import { OffersScreen } from './src/presentation/screens/OffersScreen';

// Components
import { PendingOfferModal } from './src/presentation/components/PendingOfferModal';

// Utilities
import { initStorage } from './src/utils/storage';

const Stack = createStackNavigator();
const queryClient = new QueryClient();

const AppNavigator = () => {
  const { isAuthenticated, riderProfile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#FF4732" />
      </View>
    );
  }

  // Not authenticated -> Sign In screen
  if (!isAuthenticated) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="SignIn" component={SignInScreen} />
      </Stack.Navigator>
    );
  }

  // Authenticated but registration details or KYC not approved -> KYC screen
  if (!riderProfile?.name || !riderProfile?.vehicleNumber || riderProfile?.kycStatus !== 'Verified') {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Kyc" component={KycScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    );
  }

  // Authenticated and KYC approved -> Dashboard and full app navigator
  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="ActiveDelivery" component={ActiveDeliveryScreen} />
        <Stack.Screen name="Earnings" component={EarningsScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Offers" component={OffersScreen} />
      </Stack.Navigator>
      <PendingOfferModal />
    </>
  );
};

export default function App() {
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    initStorage()
      .then(() => setStorageReady(true))
      .catch((err) => {
        console.error('Failed to initialize local storage mock:', err);
        setStorageReady(true);
      });
  }, []);

  if (!storageReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#FF4732" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ToastProvider>
          <AuthProvider>
            <DeliveryProvider>
              <NavigationContainer>
                <StatusBar style="dark" />
                <AppNavigator />
              </NavigationContainer>
            </DeliveryProvider>
          </AuthProvider>
        </ToastProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
