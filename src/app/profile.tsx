import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Switch,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/context/auth-context';
import {
  Camera,
  LogOut,
  Shield,
  User as UserIcon,
  Key,
  ChevronRight,
  Check,
  ScanFace,
  Mail,
} from 'lucide-react-native';
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
    Haptics.selectionAsync();
    if (value) {
      setShowPinSetup(true);
    } else {
      Alert.alert('Desativar PIN', 'Remover senha de acesso e biometria?', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desativar',
          style: 'destructive',
          onPress: async () => {
            await SecureStore.deleteItemAsync('user_pin');
            await SecureStore.deleteItemAsync('biometrics_enabled');
            setIsPinEnabled(false);
            setIsBiometricsEnabled(false);
          },
        },
      ]);
    }
  };

  const handleToggleBiometrics = async (value: boolean) => {
    Haptics.selectionAsync();
    await SecureStore.setItemAsync('biometrics_enabled', value ? 'true' : 'false');
    setIsBiometricsEnabled(value);
  };

  const handleSignOut = () => {
    Haptics.selectionAsync();
    Alert.alert('Sair?', 'Você precisará fazer login novamente.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          const { error } = await signOut();
          if (error) Alert.alert('Erro', error.message || 'Falha ao deslogar.');
        },
      },
    ]);
  };

  const handlePhotoUpload = async () => {
    Haptics.selectionAsync();
    setLoading(true);
    const { error, success } = await updateAvatar();
    setLoading(false);
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (error && error !== 'Cancelled' && error !== 'Permission denied') {
      Alert.alert(
        'Aviso',
        'Foto atualizada localmente. O bucket "avatars" precisa ser criado no Supabase.'
      );
    }
  };

  const handleRegenerateApiKey = async () => {
    if (!user) return;
    Haptics.selectionAsync();
    Alert.alert(
      'Regerar chave',
      'A chave anterior deixará de funcionar. Atalhos antigos vão parar até serem atualizados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Gerar nova',
          onPress: async () => {
            setRegenerating(true);
            try {
              const newKey = Array.from({ length: 32 }, () =>
                Math.floor(Math.random() * 16).toString(16)
              ).join('');

              const { error } = await supabase
                .from('profiles')
                .update({ shortcut_api_key: newKey })
                .eq('id', user.id);

              if (error) throw error;
              await refreshProfile();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
          Alert.alert('PIN configurado', 'Seu código foi salvo com segurança.');
        }}
        onCancelSetting={() => setShowPinSetup(false)}
        onUnlock={() => {}}
      />
    );
  }

  const apiKeyShort = profile?.shortcut_api_key
    ? `${profile.shortcut_api_key.slice(0, 8)}…${profile.shortcut_api_key.slice(-4)}`
    : '—';

  return (
    <View className="flex-1 bg-black">
      <View className="px-6 pt-14 pb-4">
        <Text className="text-zinc-500 text-[11px] font-semibold uppercase tracking-wider">
          Ajustes
        </Text>
        <Text className="text-white text-[28px] font-bold tracking-tight">Perfil</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        className="flex-1 px-5 pt-2"
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Card */}
        <View
          className="items-center rounded-3xl py-7 mb-6"
          style={{
            backgroundColor: '#1C1C1E',
            borderWidth: 1,
            borderColor: '#2C2C2E',
          }}
        >
          <View className="relative">
            <View
              className="overflow-hidden items-center justify-center"
              style={{
                width: 84,
                height: 84,
                borderRadius: 42,
                backgroundColor: '#2C2C2E',
              }}
            >
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : (
                <Text className="text-white text-3xl font-bold">
                  {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={handlePhotoUpload}
              disabled={loading}
              activeOpacity={0.85}
              className="absolute items-center justify-center"
              style={{
                bottom: -2,
                right: -2,
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: '#007AFF',
                borderWidth: 3,
                borderColor: '#1C1C1E',
              }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Camera size={12} color="white" strokeWidth={2.5} />
              )}
            </TouchableOpacity>
          </View>

          <Text className="text-white text-[18px] font-bold mt-4">
            {profile?.full_name || 'Usuário'}
          </Text>
          <Text className="text-zinc-500 text-[13px] mt-0.5">{user?.email}</Text>
        </View>

        {/* Account */}
        <SectionHeader>Conta</SectionHeader>
        <Card>
          <Row
            icon={<UserIcon size={16} color="#007AFF" />}
            label="Username"
            value={`@${profile?.username || 'user'}`}
          />
          <Divider />
          <Row
            icon={<Mail size={16} color="#34C759" />}
            label="E-mail"
            value={user?.email || ''}
            valueLines={1}
          />
        </Card>

        {/* Security */}
        <SectionHeader>Segurança</SectionHeader>
        <Card>
          <RowToggle
            icon={<Shield size={16} color="#FF9500" />}
            label="Bloqueio por PIN"
            description="6 dígitos para abrir o app"
            value={isPinEnabled}
            onToggle={handleTogglePin}
          />
          {isPinEnabled && isBiometricsSupported && (
            <>
              <Divider />
              <RowToggle
                icon={<ScanFace size={16} color="#5AC8FA" />}
                label="Face ID"
                description="Desbloquear com biometria"
                value={isBiometricsEnabled}
                onToggle={handleToggleBiometrics}
              />
            </>
          )}
        </Card>

        {/* Shortcuts API */}
        <SectionHeader>Atalho — API</SectionHeader>
        <Card>
          <TouchableOpacity
            onPress={handleRegenerateApiKey}
            disabled={regenerating}
            activeOpacity={0.7}
          >
            <Row
              icon={<Key size={16} color="#007AFF" />}
              label="Chave do atalho"
              description="Regerar token de acesso"
              trailing={
                regenerating ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <ChevronRight size={16} color="#48484A" />
                )
              }
            />
          </TouchableOpacity>
          <Divider />
          <View className="px-4 py-3 flex-row items-center justify-between">
            <Text
              className="text-zinc-300 text-[12px] flex-1"
              numberOfLines={1}
              style={{ fontFamily: 'Menlo' }}
            >
              {apiKeyShort}
            </Text>
            <View
              className="flex-row items-center"
              style={{
                backgroundColor: 'rgba(52,199,89,0.12)',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 100,
                gap: 4,
              }}
            >
              <Check size={10} color="#34C759" strokeWidth={3} />
              <Text className="text-green-500 text-[10px] font-bold">Ativa</Text>
            </View>
          </View>
        </Card>

        {/* Sign out */}
        <TouchableOpacity
          onPress={handleSignOut}
          activeOpacity={0.7}
          className="rounded-2xl items-center justify-center flex-row mt-2"
          style={{
            paddingVertical: 14,
            backgroundColor: 'rgba(255,59,48,0.08)',
            borderWidth: 1,
            borderColor: 'rgba(255,59,48,0.2)',
            gap: 8,
          }}
        >
          <LogOut size={16} color="#FF3B30" />
          <Text className="text-red-500 font-semibold text-[14px]">Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ==================== Helpers ====================
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-zinc-500 text-[11px] font-semibold uppercase tracking-wider mb-2 ml-1 mt-4">
      {children}
    </Text>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View
      className="rounded-2xl overflow-hidden mb-2"
      style={{
        backgroundColor: '#1C1C1E',
        borderWidth: 1,
        borderColor: '#2C2C2E',
      }}
    >
      {children}
    </View>
  );
}

function Divider() {
  return <View style={{ height: 0.5, backgroundColor: '#2C2C2E', marginLeft: 48 }} />;
}

interface RowProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  value?: string;
  valueLines?: number;
  trailing?: React.ReactNode;
}

function Row({ icon, label, description, value, valueLines, trailing }: RowProps) {
  return (
    <View className="px-4 py-3 flex-row items-center">
      <View
        className="items-center justify-center mr-3"
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          backgroundColor: '#2C2C2E',
        }}
      >
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-white text-[14px] font-medium">{label}</Text>
        {description && (
          <Text className="text-zinc-500 text-[11px] mt-0.5">{description}</Text>
        )}
      </View>
      {value && (
        <Text className="text-zinc-400 text-[13px] ml-2" numberOfLines={valueLines}>
          {value}
        </Text>
      )}
      {trailing}
    </View>
  );
}

interface RowToggleProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  value: boolean;
  onToggle: (value: boolean) => void;
}

function RowToggle({ icon, label, description, value, onToggle }: RowToggleProps) {
  return (
    <View className="px-4 py-3 flex-row items-center">
      <View
        className="items-center justify-center mr-3"
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          backgroundColor: '#2C2C2E',
        }}
      >
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-white text-[14px] font-medium">{label}</Text>
        {description && (
          <Text className="text-zinc-500 text-[11px] mt-0.5">{description}</Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#3A3A3C', true: '#34C759' }}
        ios_backgroundColor="#3A3A3C"
      />
    </View>
  );
}
