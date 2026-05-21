import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  Pressable,
  Animated,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/context/auth-context';
import { ScanFace, ChevronLeft, Delete } from 'lucide-react-native';

interface PinLockScreenProps {
  onUnlock: () => void;
  isSettingPin?: boolean;
  onPinConfigured?: (pin: string) => void;
  onCancelSetting?: () => void;
}

export function PinLockScreen({
  onUnlock,
  isSettingPin = false,
  onPinConfigured,
  onCancelSetting,
}: PinLockScreenProps) {
  const { profile } = useAuth();
  const [pin, setPin] = useState('');
  const [confirmMode, setConfirmMode] = useState(false);
  const [tempPin, setTempPin] = useState('');
  const [greeting, setGreeting] = useState('Olá');
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Bom dia');
    else if (hour < 18) setGreeting('Boa tarde');
    else setGreeting('Boa noite');

    if (!isSettingPin) {
      // Delay so iOS has time to settle into 'active'
      const t = setTimeout(checkBiometricsAndAuthenticate, 300);
      return () => clearTimeout(t);
    }
  }, []);

  const checkBiometricsAndAuthenticate = async () => {
    try {
      const isEnabled = await SecureStore.getItemAsync('biometrics_enabled');
      if (isEnabled !== 'true') return;

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) return;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Desbloquear iFinance',
        fallbackLabel: 'Usar código PIN',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onUnlock();
      }
    } catch (error) {
      console.warn('Biometric authentication failed:', error);
    }
  };

  const triggerShake = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleKeyPress = async (num: string) => {
    if (pin.length >= 6) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newPin = pin + num;
    setPin(newPin);

    if (newPin.length === 6) {
      setTimeout(async () => {
        if (isSettingPin) {
          if (!confirmMode) {
            setTempPin(newPin);
            setPin('');
            setConfirmMode(true);
          } else {
            if (newPin === tempPin) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onPinConfigured?.(newPin);
            } else {
              triggerShake();
              setTimeout(() => {
                setPin('');
                setTempPin('');
                setConfirmMode(false);
              }, 400);
            }
          }
        } else {
          const storedPin = await SecureStore.getItemAsync('user_pin');
          if (newPin === storedPin) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onUnlock();
          } else {
            triggerShake();
            setTimeout(() => setPin(''), 400);
          }
        }
      }, 180);
    }
  };

  const handleBackspace = () => {
    if (pin.length === 0) return;
    Haptics.selectionAsync();
    setPin(pin.slice(0, -1));
  };

  const handleBiometricClick = async () => {
    if (isSettingPin) return;
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert(
          'Biometria indisponível',
          'Face ID ou Touch ID não configurado neste dispositivo.'
        );
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Desbloquear iFinance',
        fallbackLabel: 'Usar código PIN',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onUnlock();
      }
    } catch (error) {
      console.warn('Biometric authentication failed:', error);
    }
  };

  const getFirstName = () => {
    if (!profile?.full_name) return 'Usuário';
    return profile.full_name.split(' ')[0];
  };

  const title = isSettingPin
    ? confirmMode
      ? 'Confirme seu PIN'
      : 'Crie um PIN de 6 dígitos'
    : `${greeting}, ${getFirstName()}`;

  const subtitle = isSettingPin
    ? 'Acesso rápido protegido por código.'
    : 'Digite seu código para desbloquear.';

  return (
    <View className="flex-1 bg-black justify-between" style={{ paddingTop: 72, paddingBottom: 48 }}>
      {/* Top - cancel button if setting */}
      {isSettingPin && onCancelSetting && (
        <View className="absolute left-4 z-10" style={{ top: 56 }}>
          <TouchableOpacity
            onPress={onCancelSetting}
            activeOpacity={0.6}
            className="bg-zinc-900 border border-zinc-800 items-center justify-center"
            style={{ width: 40, height: 40, borderRadius: 20 }}
          >
            <ChevronLeft size={22} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* Header */}
      <View className="items-center px-8">
        <View
          className="rounded-full overflow-hidden items-center justify-center mb-6"
          style={{
            width: 72,
            height: 72,
            backgroundColor: '#1C1C1E',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        >
          {profile?.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <Text className="text-white text-2xl font-bold">
              {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          )}
        </View>

        <Text className="text-white text-[22px] font-semibold tracking-tight text-center">
          {title}
        </Text>
        <Text className="text-zinc-500 text-[14px] mt-2 text-center">{subtitle}</Text>

        {/* Dots */}
        <Animated.View
          className="flex-row mt-10"
          style={{ gap: 18, transform: [{ translateX: shakeAnim }] }}
        >
          {[...Array(6)].map((_, i) => {
            const filled = i < pin.length;
            return (
              <View
                key={i}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: filled ? '#FFFFFF' : 'transparent',
                  borderWidth: filled ? 0 : 1.5,
                  borderColor: 'rgba(255,255,255,0.25)',
                }}
              />
            );
          })}
        </Animated.View>
      </View>

      {/* Keypad */}
      <View className="px-12">
        {[
          ['1', '2', '3'],
          ['4', '5', '6'],
          ['7', '8', '9'],
        ].map((row) => (
          <View
            key={row.join('')}
            className="flex-row justify-between"
            style={{ marginBottom: 18 }}
          >
            {row.map((num) => (
              <KeypadButton key={num} value={num} onPress={() => handleKeyPress(num)} />
            ))}
          </View>
        ))}

        {/* Bottom row */}
        <View className="flex-row justify-between items-center" style={{ marginBottom: 4 }}>
          {/* Face ID button */}
          {isSettingPin ? (
            <View style={{ width: 72, height: 72 }} />
          ) : (
            <KeypadButton
              onPress={handleBiometricClick}
              icon={<ScanFace size={26} color="white" strokeWidth={1.6} />}
              ghost
            />
          )}

          <KeypadButton value="0" onPress={() => handleKeyPress('0')} />

          {pin.length > 0 ? (
            <KeypadButton
              onPress={handleBackspace}
              icon={<Delete size={24} color="white" strokeWidth={1.6} />}
              ghost
            />
          ) : (
            <View style={{ width: 72, height: 72 }} />
          )}
        </View>

        {/* Forgot link */}
        {!isSettingPin && (
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                'Esqueceu o código?',
                'Faça logout e entre novamente para redefinir seu PIN.',
                [{ text: 'OK' }]
              );
            }}
            activeOpacity={0.5}
            className="items-center"
            style={{ marginTop: 24 }}
          >
            <Text className="text-zinc-500 text-[13px]">Esqueceu sua senha?</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ==================== Keypad Button ====================
interface KeypadButtonProps {
  value?: string;
  icon?: React.ReactNode;
  ghost?: boolean;
  onPress: () => void;
}

function KeypadButton({ value, icon, ghost, onPress }: KeypadButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.92,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={{ width: 72, height: 72 }}
    >
      <Animated.View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: ghost ? 'transparent' : 'rgba(255,255,255,0.07)',
          transform: [{ scale }],
        }}
      >
        {value ? (
          <Text style={{ color: 'white', fontSize: 30, fontWeight: '300' }}>{value}</Text>
        ) : (
          icon
        )}
      </Animated.View>
    </Pressable>
  );
}
