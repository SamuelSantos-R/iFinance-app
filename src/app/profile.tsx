import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image, Switch, Platform } from 'react-native';
import { useAuth } from '@/context/auth-context';
import { Camera, LogOut, Shield, User, Key, ChevronRight, Check, ScanFace } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { PinLockScreen } from '@/components/pin-lock-screen';

export default function ProfileScreen() {
  const { user, profile, signOut, updateAvatar, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [isPinEnabled, setIsPinEnabled] = useState(false);
  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState(false);
  const [isBiometricsSupported, setIsBiometricsSupported] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);

  useEffect(() => {
    async function loadSecuritySettings() {
      const pin = await SecureStore.getItemAsync('user_pin');
      setIsPinEnabled(!!pin);

      const bio = await SecureStore.getItemAsync('biometrics_enabled');
      setIsBiometricsEnabled(bio === 'true');

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setIsBiometricsSupported(hasHardware && isEnrolled);
    }
    loadSecuritySettings();
  }, []);

  const handleTogglePin = async (value: boolean) => {
    if (value) {
      setShowPinSetup(true);
    } else {
      Alert.alert(
        'Desativar PIN',
        'Tem certeza que deseja remover a senha de acesso e biometria?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Desativar',
            style: 'destructive',
            onPress: async () => {
              await SecureStore.deleteItemAsync('user_pin');
              await SecureStore.deleteItemAsync('biometrics_enabled');
              setIsPinEnabled(false);
              setIsBiometricsEnabled(false);
              Alert.alert('Segurança', 'Bloqueio por PIN desativado.');
            }
          }
        ]
      );
    }
  };

  const handleToggleBiometrics = async (value: boolean) => {
    if (value) {
      await SecureStore.setItemAsync('biometrics_enabled', 'true');
      setIsBiometricsEnabled(true);
    } else {
      await SecureStore.setItemAsync('biometrics_enabled', 'false');
      setIsBiometricsEnabled(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sair da Conta', 'Deseja realmente sair do iFinance?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          const { error } = await signOut();
          if (error) {
            Alert.alert('Erro', error.message || 'Falha ao deslogar.');
          }
        },
      },
    ]);
  };

  const handlePhotoUpload = async () => {
    setLoading(true);
    const { error, success } = await updateAvatar();
    setLoading(false);
    
    if (success) {
      Alert.alert('Sucesso', 'Foto de perfil atualizada!');
    } else if (error && error !== 'Cancelled' && error !== 'Permission denied') {
      Alert.alert('Aviso', 'A foto foi atualizada localmente, pois o bucket do Supabase ainda precisa ser criado.');
    }
  };

  const handleRegenerateApiKey = async () => {
    if (!user) return;
    
    Alert.alert(
      'Regerar Chave',
      'Isso tornará a chave anterior inválida. Seus atalhos antigos pararão de funcionar até que você atualize para a nova chave.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Gerar Nova Chave',
          onPress: async () => {
            setRegenerating(true);
            try {
              // Generate random 32 char hex key
              const newKey = Array.from({ length: 32 }, () =>
                Math.floor(Math.random() * 16).toString(16)
              ).join('');

              const { error } = await supabase
                .from('profiles')
                .update({ shortcut_api_key: newKey })
                .eq('id', user.id);

              if (error) throw error;
              await refreshProfile();
              Alert.alert('Chave Regenerada', 'Sua nova chave de atalho foi gerada com sucesso.');
            } catch (err: any) {
              Alert.alert('Erro', err.message || 'Falha ao gerar chave.');
            } finally {
              setRegenerating(false);
            }
          },
        },
      ]
    );
  };

  if (showPinSetup) {
    return (
      <PinLockScreen 
        isSettingPin={true}
        onPinConfigured={async (newPin) => {
          await SecureStore.setItemAsync('user_pin', newPin);
          setIsPinEnabled(true);
          setShowPinSetup(false);
          if (isBiometricsSupported) {
            await SecureStore.setItemAsync('biometrics_enabled', 'true');
            setIsBiometricsEnabled(true);
          }
          Alert.alert('Sucesso', 'Código PIN configurado!');
        }}
        onCancelSetting={() => {
          setShowPinSetup(false);
        }}
        onUnlock={() => {}}
      />
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* Header */}
      <View className="px-6 pt-14 pb-4 border-b border-zinc-900">
        <Text className="text-zinc-500 text-xs font-semibold uppercase tracking-wider font-rounded">Ajustes</Text>
        <Text className="text-white text-2xl font-bold font-rounded">Meu Perfil</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} className="flex-1 px-6 pt-6">
        {/* User Card */}
        <View className="items-center mb-8">
          <View className="relative">
            <View className="w-24 h-24 rounded-full bg-zinc-800 border-2 border-zinc-700 items-center justify-center overflow-hidden">
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
            <TouchableOpacity
              onPress={handlePhotoUpload}
              disabled={loading}
              className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full items-center justify-center border-2 border-black active:bg-blue-700 shadow"
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Camera size={14} color="white" />
              )}
            </TouchableOpacity>
          </View>

          <Text className="text-white text-xl font-bold mt-4 font-rounded">
            {profile?.full_name || 'Usuário'}
          </Text>
          <Text className="text-zinc-500 text-sm font-rounded">
            {user?.email}
          </Text>
        </View>

        {/* Section: Conta */}
        <Text className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2 font-rounded">Informações de Conta</Text>
        <View className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden mb-6">
          <View className="p-4 flex-row items-center justify-between border-b border-zinc-800/80">
            <View className="flex-row items-center">
              <User size={18} color="#007AFF" style={{ marginRight: 12 }} />
              <Text className="text-white font-medium text-sm font-rounded">Username</Text>
            </View>
            <Text className="text-zinc-500 text-sm font-rounded">@{profile?.username || 'user'}</Text>
          </View>
          <View className="p-4 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Shield size={18} color="#34C759" style={{ marginRight: 12 }} />
              <Text className="text-white font-medium text-sm font-rounded">ID Supabase</Text>
            </View>
            <Text className="text-zinc-500 text-xs font-mono" numberOfLines={1}>
              {user?.id.slice(0, 12)}...
            </Text>
          </View>
        </View>

        {/* Section: Segurança & API */}
        <Text className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2 font-rounded font-rounded">Segurança e Atalhos</Text>
        <View className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden mb-8">
          
          {/* Bloqueio por PIN */}
          <View className="p-4 flex-row items-center justify-between border-b border-zinc-800/80">
            <View className="flex-row items-center">
              <Shield size={18} color="#FF9500" style={{ marginRight: 12 }} />
              <View>
                <Text className="text-white font-medium text-sm font-rounded">Senha PIN de 6 dígitos</Text>
                <Text className="text-zinc-500 text-xs font-rounded mt-0.5">Bloquear o app ao iniciar</Text>
              </View>
            </View>
            <Switch
              value={isPinEnabled}
              onValueChange={handleTogglePin}
              trackColor={{ false: '#3a3a3c', true: '#34c759' }}
              thumbColor={Platform.OS === 'android' ? (isPinEnabled ? '#34c759' : '#f4f3f4') : ''}
            />
          </View>

          {/* Desbloqueio com Face ID */}
          {isPinEnabled && isBiometricsSupported && (
            <View className="p-4 flex-row items-center justify-between border-b border-zinc-800/80">
              <View className="flex-row items-center">
                <ScanFace size={18} color="#FF3B30" style={{ marginRight: 12 }} />
                <View>
                  <Text className="text-white font-medium text-sm font-rounded">Desbloquear com Face ID</Text>
                  <Text className="text-zinc-500 text-xs font-rounded mt-0.5">Usar reconhecimento facial</Text>
                </View>
              </View>
              <Switch
                value={isBiometricsEnabled}
                onValueChange={handleToggleBiometrics}
                trackColor={{ false: '#3a3a3c', true: '#34c759' }}
                thumbColor={Platform.OS === 'android' ? (isBiometricsEnabled ? '#34c759' : '#f4f3f4') : ''}
              />
            </View>
          )}

          {/* Chave de Atalho */}
          <TouchableOpacity
            onPress={handleRegenerateApiKey}
            disabled={regenerating}
            className="p-4 flex-row items-center justify-between border-b border-zinc-800/80 active:bg-zinc-850"
          >
            <View className="flex-row items-center">
              <Key size={18} color="#007AFF" style={{ marginRight: 12 }} />
              <View>
                <Text className="text-white font-medium text-sm font-rounded">Chave do Atalho</Text>
                <Text className="text-zinc-500 text-xs font-rounded mt-0.5">Regerar token de acesso</Text>
              </View>
            </View>
            {regenerating ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <ChevronRight size={18} color="#48484A" />
            )}
          </TouchableOpacity>

          <View className="p-4 flex-row items-center justify-between">
            <Text className="text-zinc-400 text-xs font-mono flex-1 mr-4" numberOfLines={1}>
              {profile?.shortcut_api_key}
            </Text>
            <View className="bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full flex-row items-center">
              <Check size={10} color="#34C759" style={{ marginRight: 4 }} />
              <Text className="text-green-500 text-[10px] font-bold font-rounded">Ativa</Text>
            </View>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          onPress={handleSignOut}
          className="w-full bg-red-500/10 border border-red-500/20 rounded-2xl py-4 flex-row items-center justify-center active:bg-red-500/20 shadow-sm"
        >
          <LogOut size={18} color="#FF3B30" className="mr-2" />
          <Text className="text-red-500 font-bold text-base font-rounded">Sair do Aplicativo</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
