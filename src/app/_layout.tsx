import '@/global.css';
import React, { useState, useEffect, useRef } from 'react';
import { ActivityIndicator, View, AppState, AppStateStatus } from 'react-native';
import { Tabs } from 'expo-router';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { AuthScreen } from '@/components/auth-screen';
import { PinLockScreen } from '@/components/pin-lock-screen';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { Home, Receipt, Smartphone, User } from 'lucide-react-native';

// Background fetch handler for notifications (idle config)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function AppContent() {
  const { session, loading } = useAuth();
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [checkingPin, setCheckingPin] = useState(true);
  // tracks last "real" state (foreground vs background), ignoring transient `inactive` from FaceID prompts
  const lastRealStateRef = useRef<AppStateStatus>('active');

  const refreshLockStatus = async (force = false) => {
    if (!session) {
      setIsAppLocked(false);
      return;
    }
    try {
      const storedPin = await SecureStore.getItemAsync('user_pin');
      if (storedPin) {
        if (force) setIsAppLocked(true);
        return !!storedPin;
      }
      return false;
    } catch (e) {
      console.warn('Failed to load PIN status:', e);
      return false;
    }
  };

  useEffect(() => {
    async function init() {
      if (session) {
        await refreshLockStatus(true);
      } else {
        setIsAppLocked(false);
      }
      setCheckingPin(false);
    }
    init();
  }, [session]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      // Only treat background as a "real" background event.
      // `inactive` triggers when iOS shows FaceID/Apple/Notification prompts — ignore those.
      if (nextAppState === 'background') {
        lastRealStateRef.current = 'background';
        return;
      }
      if (nextAppState === 'active') {
        if (lastRealStateRef.current === 'background' && session) {
          const storedPin = await SecureStore.getItemAsync('user_pin');
          if (storedPin) setIsAppLocked(true);
        }
        lastRealStateRef.current = 'active';
      }
    });
    return () => subscription.remove();
  }, [session]);

  if (loading || checkingPin) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  if (isAppLocked) {
    return <PinLockScreen onUnlock={() => setIsAppLocked(false)} />;
  }

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
