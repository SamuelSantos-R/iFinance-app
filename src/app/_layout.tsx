import '@/global.css';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ActivityIndicator, View, AppState, AppStateStatus } from 'react-native';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { AuthScreen } from '@/components/auth-screen';
import { PinLockScreen } from '@/components/pin-lock-screen';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';

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

  const refreshLockStatus = useCallback(async (force = false) => {
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
  }, [session]);

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
  }, [refreshLockStatus, session]);

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
    <NativeTabs
      tintColor="#0A84FF"
      iconColor={{ default: '#8E8E93', selected: '#0A84FF' }}
      labelStyle={{
        fontFamily: 'SF Pro Rounded',
        fontSize: 11,
        fontWeight: '600',
      }}
      backgroundColor="rgba(0,0,0,0.62)"
      blurEffect="systemChromeMaterialDark"
      minimizeBehavior="onScrollDown"
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
        <NativeTabs.Trigger.Label>Dashboard</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="transactions">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'list.bullet.rectangle', selected: 'list.bullet.rectangle.fill' }}
          md="receipt_long"
        />
        <NativeTabs.Trigger.Label>Transações</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="shortcuts">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'iphone.gen3.radiowaves.left.and.right', selected: 'iphone.gen3.radiowaves.left.and.right' }}
          md="smartphone"
        />
        <NativeTabs.Trigger.Label>Shortcuts</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} md="account_circle" />
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

export default function TabLayout() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
