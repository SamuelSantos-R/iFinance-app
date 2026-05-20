import '@/global.css';
import React, { useState, useEffect } from 'react';
import { useColorScheme, ActivityIndicator, View, AppState, AppStateStatus } from 'react-native';
import { Tabs } from 'expo-router';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { AuthScreen } from '@/components/auth-screen';
import { PinLockScreen } from '@/components/pin-lock-screen';
import * as SecureStore from 'expo-secure-store';
import { Home, Receipt, Smartphone, User } from 'lucide-react-native';

function AppContent() {
  const { session, loading } = useAuth();
  const colorScheme = useColorScheme();
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [checkingPin, setCheckingPin] = useState(true);

  // Check if PIN lock is enabled on mount
  useEffect(() => {
    async function checkPinStatus() {
      if (session) {
        try {
          const storedPin = await SecureStore.getItemAsync('user_pin');
          if (storedPin) {
            setIsAppLocked(true);
          }
        } catch (e) {
          console.error('Failed to load PIN status:', e);
        }
      }
      setCheckingPin(false);
    }
    checkPinStatus();
  }, [session]);

  // Listen to AppState changes (to lock app when coming back from background)
  useEffect(() => {
    let prevAppState = AppState.currentState;

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      // Only lock if the app was in the background (user closed or locked the phone)
      // and is now coming back to active. System dialogs like FaceID trigger 'inactive', which we ignore.
      if (prevAppState === 'background' && nextAppState === 'active' && session) {
        try {
          const storedPin = await SecureStore.getItemAsync('user_pin');
          if (storedPin) {
            setIsAppLocked(true);
          }
        } catch (e) {
          console.error('Failed to load PIN status on resume:', e);
        }
      }
      prevAppState = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [session]);

  if (loading || checkingPin) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  if (isAppLocked) {
    return <PinLockScreen onUnlock={() => setIsAppLocked(false)} />;
  }

  // Standard, stable Expo Router Tabs
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopColor: '#1C1C1E',
          paddingBottom: 4,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontFamily: 'SF Pro Rounded',
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transações',
          tabBarIcon: ({ color, size }) => <Receipt size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="shortcuts"
        options={{
          title: 'Shortcuts',
          tabBarIcon: ({ color, size }) => <Smartphone size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
