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
import { LanguageProvider } from './src/presentation/context/LanguageContext';

// Screens
import { SignInScreen } from './src/presentation/screens/SignInScreen';
import { KycScreen } from './src/presentation/screens/KycScreen';
import { DashboardScreen } from './src/presentation/screens/DashboardScreen';
import { ActiveDeliveryScreen } from './src/presentation/screens/ActiveDeliveryScreen';
import { EarningsScreen } from './src/presentation/screens/EarningsScreen';
import { ProfileScreen } from './src/presentation/screens/ProfileScreen';
import { OffersScreen } from './src/presentation/screens/OffersScreen';
import { HistoryScreen } from './src/presentation/screens/HistoryScreen';

// Components
import { PendingOfferModal } from './src/presentation/components/PendingOfferModal';
import { LocationWarningModal } from './src/presentation/components/LocationWarningModal';
import { LanguageSelectionModal } from './src/presentation/components/LanguageSelectionModal';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BottomTabBar } from './src/presentation/components/BottomTabBar';
import { DashboardSkeleton } from './src/presentation/components/SkeletonLoader';

import { initStorage } from './src/utils/storage';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const queryClient = new QueryClient();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Earnings" component={EarningsScreen} />
      <Tab.Screen name="Offers" component={OffersScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const isKycApproved = (profile: any) => {
  if (!profile) return false;
  const status = String(profile.kycStatus || profile.status || '').toUpperCase();
  return status === 'VERIFIED' || status === 'APPROVED' || status === 'COMPLETED' || profile.isKycApproved === true;
};

const AppNavigator = () => {
  const { isAuthenticated, riderProfile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F3F4F6', paddingTop: 40 }}>
        <DashboardSkeleton />
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
  if (!riderProfile || !isKycApproved(riderProfile)) {
    return (
      <>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Kyc" component={KycScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
        </Stack.Navigator>
        <LanguageSelectionModal />
      </>
    );
  }

  // Authenticated and KYC approved -> Dashboard and full app navigator
  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen name="ActiveDelivery" component={ActiveDeliveryScreen} />
        <Stack.Screen name="Kyc" component={KycScreen} />
      </Stack.Navigator>
      <PendingOfferModal />
      <LocationWarningModal />
      <LanguageSelectionModal />
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
      <View style={{ flex: 1, backgroundColor: '#F3F4F6', paddingTop: 40 }}>
        <DashboardSkeleton />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ToastProvider>
          <LanguageProvider>
            <AuthProvider>
              <DeliveryProvider>
                <NavigationContainer>
                  <StatusBar style="dark" />
                  <AppNavigator />
                </NavigationContainer>
              </DeliveryProvider>
            </AuthProvider>
          </LanguageProvider>
        </ToastProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
