import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, AppState, Dimensions, ImageBackground } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@/context/auth-context';
import { LucideIcon, ScanFace, ChevronLeft, Delete } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface PinLockScreenProps {
  onUnlock: () => void;
  isSettingPin?: boolean; // if true, this is used to configure a new PIN
  onPinConfigured?: (pin: string) => void;
  onCancelSetting?: () => void;
}

export function PinLockScreen({ onUnlock, isSettingPin = false, onPinConfigured, onCancelSetting }: PinLockScreenProps) {
  const { user, profile } = useAuth();
  const [pin, setPin] = useState('');
  const [confirmMode, setConfirmMode] = useState(false);
  const [tempPin, setTempPin] = useState('');
  const [greeting, setGreeting] = useState('Olá');

  useEffect(() => {
    // Dynamic greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Bom dia');
    else if (hour < 18) setGreeting('Boa tarde');
    else setGreeting('Boa noite');

    // Auto-trigger biometric auth if not in setup mode
    if (!isSettingPin) {
      checkBiometricsAndAuthenticate();
    }
  }, []);

  const checkBiometricsAndAuthenticate = async () => {
    try {
      const isEnabled = await SecureStore.getItemAsync('biometrics_enabled');
      if (isEnabled !== 'true') return;

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Desbloquear iFinance',
          fallbackLabel: 'Usar Código PIN',
          disableDeviceFallback: false,
        });

        if (result.success) {
          onUnlock();
        }
      }
    } catch (error) {
      console.error('Biometric authentication failed:', error);
    }
  };

  const handleKeyPress = async (num: string) => {
    if (pin.length >= 6) return;

    const newPin = pin + num;
    setPin(newPin);

    if (newPin.length === 6) {
      // Small delay for visual feedback of the last dot lighting up
      setTimeout(async () => {
        if (isSettingPin) {
          if (!confirmMode) {
            setTempPin(newPin);
            setPin('');
            setConfirmMode(true);
          } else {
            if (newPin === tempPin) {
              if (onPinConfigured) {
                onPinConfigured(newPin);
              }
            } else {
              Alert.alert('Erro', 'Os códigos PIN não coincidem. Tente novamente.');
              setPin('');
              setTempPin('');
              setConfirmMode(false);
            }
          }
        } else {
          // Verify PIN
          const storedPin = await SecureStore.getItemAsync('user_pin');
          if (newPin === storedPin) {
            onUnlock();
          } else {
            Alert.alert('Código Incorreto', 'O PIN inserido está incorreto. Tente novamente.');
            setPin('');
          }
        }
      }, 200);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleBiometricClick = async () => {
    if (isSettingPin) return;

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert('Biometria Indisponível', 'Face ID ou Touch ID não configurado neste dispositivo.');
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Desbloquear iFinance',
        disableDeviceFallback: false,
      });

      if (result.success) {
        onUnlock();
      }
    } catch (error: any) {
      console.error('Biometric authentication failed:', error);
    }
  };

  const getFirstName = () => {
    if (!profile?.full_name) return 'Usuário';
    return profile.full_name.split(' ')[0];
  };

  return (
    <ImageBackground 
      source={require('../../assets/images/mesh_lockscreen_bg.png')} 
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <View className="flex-1 justify-between py-20 px-8 bg-black/30">
        {/* Top Section */}
        <View className="items-center mt-12">
          {isSettingPin && onCancelSetting && (
            <TouchableOpacity 
              onPress={onCancelSetting}
              className="absolute left-0 top-0 w-10 h-10 rounded-full bg-zinc-900/60 border border-zinc-800/80 items-center justify-center"
            >
              <ChevronLeft size={22} color="white" />
            </TouchableOpacity>
          )}

          <View className="w-24 h-24 rounded-full border border-white/20 items-center justify-center overflow-hidden mb-6 shadow-2xl">
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <Text className="text-white text-3xl font-bold font-rounded">
                {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            )}
          </View>

          <Text className="text-white text-2xl font-semibold font-rounded tracking-tight text-center">
            {isSettingPin 
              ? (confirmMode ? 'Confirme seu PIN' : 'Defina um PIN de 6 dígitos')
              : `${greeting}, ${getFirstName()}!`
            }
          </Text>
          {isSettingPin && (
            <Text className="text-zinc-400 text-sm mt-1 font-rounded">
              Crie uma senha de acesso rápido
            </Text>
          )}
        </View>

        {/* Dots Indicator */}
        <View className="flex-row justify-center gap-5 my-10">
          {[...Array(6)].map((_, i) => (
            <View
              key={i}
              style={{ width: 18, height: 18 }}
              className={`rounded-full ${
                i < pin.length 
                  ? 'bg-zinc-200 shadow-md shadow-white/30' 
                  : 'bg-white/10 border border-white/25'
              }`}
            />
          ))}
        </View>

        {/* Keyboard */}
        <View className="items-center mb-8">
          {/* Rows 1-3 */}
          {[
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9']
          ].map((row, rowIndex) => (
            <View key={rowIndex} className="flex-row justify-center gap-6 mb-5" style={{ width: width * 0.85 }}>
              {row.map((num) => (
                <TouchableOpacity
                  key={num}
                  onPress={() => handleKeyPress(num)}
                  style={{ width: 75, height: 75 }}
                  className="rounded-full bg-white/10 border border-white/15 items-center justify-center active:bg-white/25 shadow-sm"
                >
                  <Text className="text-white text-3xl font-normal font-rounded">{num}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {/* Row 4 (FaceID - 0 - Backspace) */}
          <View className="flex-row justify-center gap-6 items-center" style={{ width: width * 0.85 }}>
            {/* Biometrics Toggle Button */}
            {isSettingPin ? (
              <View style={{ width: 75, height: 75 }} className="opacity-0" />
            ) : (
              <TouchableOpacity
                onPress={handleBiometricClick}
                style={{ width: 75, height: 75 }}
                className="rounded-full bg-white/10 border border-white/15 items-center justify-center active:bg-white/25 shadow-sm"
              >
                <ScanFace size={28} color="white" />
              </TouchableOpacity>
            )}

            {/* 0 Button */}
            <TouchableOpacity
              onPress={() => handleKeyPress('0')}
              style={{ width: 75, height: 75 }}
              className="rounded-full bg-white/10 border border-white/15 items-center justify-center active:bg-white/25 shadow-sm"
            >
              <Text className="text-white text-3xl font-normal font-rounded">0</Text>
            </TouchableOpacity>

            {/* Backspace Button - borderless to fit layout beautifully */}
            <TouchableOpacity
              onPress={handleBackspace}
              disabled={pin.length === 0}
              style={{ width: 75, height: 75 }}
              className={`items-center justify-center active:opacity-60 ${
                pin.length === 0 ? 'opacity-0' : 'opacity-80'
              }`}
            >
              <Delete size={26} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Forgot PIN / Reset Link */}
        {!isSettingPin ? (
          <TouchableOpacity 
            onPress={() => {
              Alert.alert(
                'Esqueceu a senha?',
                'Para redefinir o PIN, faça logout da sua conta e entre novamente usando e-mail/senha ou Google.',
                [{ text: 'Entendido' }]
              );
            }}
            className="items-center py-2"
          >
            <Text className="text-zinc-400 text-sm font-semibold font-rounded tracking-wide">
              Esqueceu sua senha?
            </Text>
          </TouchableOpacity>
        ) : (
          <View className="h-8" />
        )}
      </View>
    </ImageBackground>
  );
}
