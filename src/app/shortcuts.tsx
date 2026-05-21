import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Platform,
  Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/context/auth-context';
import {
  Copy,
  Share2,
  Bell,
  BellOff,
  Check,
  ChevronRight,
  Smartphone,
  Zap,
  Info,
} from 'lucide-react-native';

const BANKS_LIST = [
  { id: 'nubank', name: 'Nubank', color: '#820AD1' },
  { id: 'inter', name: 'Banco Inter', color: '#FF7A00' },
  { id: 'revolut', name: 'Revolut', color: '#0075EB' },
  { id: 'itau', name: 'Itaú', color: '#EC7000' },
  { id: 'bradesco', name: 'Bradesco', color: '#CC092F' },
  { id: 'santander', name: 'Santander', color: '#EC0000' },
];

export default function ShortcutsScreen() {
  const { profile } = useAuth();
  const [selectedBanks, setSelectedBanks] = useState<string[]>(['nubank', 'inter']);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] =
    useState<Notifications.PermissionStatus>('undetermined' as any);

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
  const rpcUrl = `${supabaseUrl}/rest/v1/rpc/add_transaction_via_shortcut`;
  const apiKey = profile?.shortcut_api_key || '—';

  const samplePayload = JSON.stringify(
    {
      api_key_param: apiKey,
      amount_param: 0,
      description_param: 'Compra no cartão',
      category_param: 'Alimentação',
      bank_param: 'Nubank',
      type_param: 'expense',
    },
    null,
    2
  );

  useEffect(() => {
    Notifications.getPermissionsAsync().then((res) => setNotificationPermission(res.status));
  }, []);

  const requestNotifications = async () => {
    Haptics.selectionAsync();
    const res = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    setNotificationPermission(res.status);

    if (res.status === 'granted') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Notificações ativadas',
          body: 'Você receberá confirmações dos seus gastos automatizados.',
        },
        trigger: null,
      });
    }
  };

  const toggleBank = (id: string) => {
    Haptics.selectionAsync();
    setSelectedBanks((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  const copy = async (text: string, field: string) => {
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const openShortcutsApp = async () => {
    Haptics.selectionAsync();
    if (Platform.OS !== 'ios') {
      Alert.alert('Indisponível', 'Os Atalhos só funcionam no iOS.');
      return;
    }
    try {
      const canOpen = await Linking.canOpenURL('shortcuts://');
      if (canOpen) {
        Linking.openURL('shortcuts://');
      } else {
        Alert.alert(
          'App Atalhos não encontrado',
          'Reinstale o app "Atalhos" pela App Store.'
        );
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const shareConfig = async () => {
    Haptics.selectionAsync();
    try {
      await Share.share({
        message: `iFinance — Configuração do Atalho\n\nURL: ${rpcUrl}\n\nHeaders:\napikey: ${supabaseAnonKey}\nContent-Type: application/json\n\nBody (JSON):\n${samplePayload}`,
      });
    } catch (error: any) {
      console.warn(error);
    }
  };

  return (
    <View className="flex-1 bg-black">
      {/* Header */}
      <View className="px-6 pt-14 pb-4">
        <Text className="text-zinc-500 text-[11px] font-semibold uppercase tracking-wider">
          Integração
        </Text>
        <Text className="text-white text-[28px] font-bold tracking-tight">Shortcuts</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
      >
        {/* How it works */}
        <View className="bg-zinc-900 rounded-3xl p-5 mb-5 border border-zinc-800/60">
          <View className="flex-row items-center mb-3">
            <View
              className="items-center justify-center mr-3"
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: 'rgba(0,122,255,0.15)',
              }}
            >
              <Zap size={16} color="#007AFF" />
            </View>
            <Text className="text-white text-[16px] font-semibold">Como funciona</Text>
          </View>
          <Text className="text-zinc-400 text-[13px] leading-5">
            Seu banco envia uma notificação de compra. O app{' '}
            <Text className="text-white font-semibold">Atalhos do iOS</Text> captura essa
            notificação, você escolhe a categoria em um menu e o lançamento aparece aqui
            automaticamente.
          </Text>
        </View>

        {/* Important - Reality check */}
        <View
          className="rounded-3xl p-5 mb-5"
          style={{ backgroundColor: 'rgba(255,149,0,0.08)', borderWidth: 1, borderColor: 'rgba(255,149,0,0.2)' }}
        >
          <View className="flex-row items-start">
            <Info size={16} color="#FF9500" style={{ marginTop: 2 }} />
            <View className="flex-1 ml-3">
              <Text className="text-orange-400 text-[13px] font-semibold mb-1">
                Importante
              </Text>
              <Text className="text-orange-300/80 text-[12px] leading-5">
                A Apple não deixa apps lerem notificações de outros apps direto. Quem captura
                é o sistema iOS, via o app Atalhos. Esse app só recebe o lançamento já
                processado.
              </Text>
            </View>
          </View>
        </View>

        {/* Notifications permission */}
        <SectionHeader>1. Permissão de Notificação</SectionHeader>
        <TouchableOpacity
          onPress={requestNotifications}
          activeOpacity={0.7}
          disabled={notificationPermission === 'granted'}
          className="bg-zinc-900 rounded-2xl px-4 py-4 mb-5 border border-zinc-800/60 flex-row items-center"
        >
          <View
            className="items-center justify-center mr-3"
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              backgroundColor:
                notificationPermission === 'granted'
                  ? 'rgba(52,199,89,0.15)'
                  : 'rgba(0,122,255,0.15)',
            }}
          >
            {notificationPermission === 'granted' ? (
              <Bell size={18} color="#34C759" />
            ) : (
              <BellOff size={18} color="#007AFF" />
            )}
          </View>
          <View className="flex-1">
            <Text className="text-white text-[14px] font-semibold">
              {notificationPermission === 'granted'
                ? 'Notificações ativadas'
                : 'Ativar notificações'}
            </Text>
            <Text className="text-zinc-500 text-[12px] mt-0.5">
              {notificationPermission === 'granted'
                ? 'Você receberá confirmação de cada gasto registrado.'
                : 'Tocando aqui o iOS pedirá permissão.'}
            </Text>
          </View>
          {notificationPermission !== 'granted' && (
            <ChevronRight size={16} color="#48484A" />
          )}
        </TouchableOpacity>

        {/* Bank selection */}
        <SectionHeader>2. Bancos para monitorar</SectionHeader>
        <View className="bg-zinc-900 rounded-3xl p-2 mb-5 border border-zinc-800/60">
          {BANKS_LIST.map((bank, i) => {
            const isSelected = selectedBanks.includes(bank.id);
            return (
              <TouchableOpacity
                key={bank.id}
                onPress={() => toggleBank(bank.id)}
                activeOpacity={0.7}
                className={`flex-row items-center justify-between px-3 py-3 ${
                  i !== BANKS_LIST.length - 1 ? 'border-b border-zinc-800/40' : ''
                }`}
              >
                <View className="flex-row items-center">
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      backgroundColor: bank.color,
                      marginRight: 12,
                    }}
                  />
                  <Text className="text-white text-[14px] font-medium">{bank.name}</Text>
                </View>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: isSelected ? '#007AFF' : 'transparent',
                    borderWidth: isSelected ? 0 : 1.5,
                    borderColor: '#3A3A3C',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isSelected && <Check size={14} color="white" strokeWidth={3} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Credentials */}
        <SectionHeader>3. Credenciais do Atalho</SectionHeader>
        <View className="bg-zinc-900 rounded-3xl p-5 mb-5 border border-zinc-800/60 gap-4">
          <CredentialField
            label="URL"
            value={rpcUrl}
            copied={copiedField === 'url'}
            onCopy={() => copy(rpcUrl, 'url')}
          />
          <CredentialField
            label="Header: apikey"
            value={supabaseAnonKey}
            copied={copiedField === 'anon'}
            onCopy={() => copy(supabaseAnonKey, 'anon')}
          />
          <CredentialField
            label="Body JSON (modelo)"
            value={samplePayload}
            multiline
            copied={copiedField === 'payload'}
            onCopy={() => copy(samplePayload, 'payload')}
          />
        </View>

        {/* Open Shortcuts */}
        <TouchableOpacity
          onPress={openShortcutsApp}
          activeOpacity={0.85}
          className="bg-blue-600 rounded-2xl px-5 py-4 flex-row items-center justify-center mb-3"
          style={{
            shadowColor: '#007AFF',
            shadowOpacity: 0.3,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          <Smartphone size={18} color="white" />
          <Text className="text-white font-semibold text-[15px] ml-2">
            Abrir app Atalhos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={shareConfig}
          activeOpacity={0.7}
          className="bg-zinc-900 border border-zinc-800/60 rounded-2xl px-5 py-4 flex-row items-center justify-center mb-6"
        >
          <Share2 size={16} color="#007AFF" />
          <Text className="text-blue-500 font-semibold text-[14px] ml-2">
            Compartilhar configurações
          </Text>
        </TouchableOpacity>

        {/* Step-by-step */}
        <SectionHeader>4. Passo a passo</SectionHeader>
        <View className="bg-zinc-900 rounded-3xl p-5 border border-zinc-800/60 gap-4">
          {[
            ['Abra o app Atalhos > aba "Automação" > Nova Automação > Notificação.', ''],
            [
              'Selecione o app do banco (ex: Nubank) e marque "Contém" → cole "compra" ou "Compra Aprovada".',
              '',
            ],
            ['Adicione a ação "Obter texto da notificação".', ''],
            [
              'Adicione "Corresponder texto" com regex `R\\$ ?(\\d+[.,]\\d{2})` para extrair o valor.',
              '',
            ],
            [
              'Adicione "Escolher do menu" → opções: Alimentação, Transporte, Moradia, Lazer, Saúde, Outros.',
              '',
            ],
            [
              'Adicione "Obter conteúdo da URL" → método POST → cole a URL, os headers e o body JSON acima (substituindo `amount_param` pelo valor extraído e `category_param` pela escolha do menu).',
              '',
            ],
          ].map((step, i) => (
            <View key={i} className="flex-row">
              <View
                className="items-center justify-center mr-3"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: 'rgba(0,122,255,0.15)',
                }}
              >
                <Text className="text-blue-500 text-[12px] font-bold">{i + 1}</Text>
              </View>
              <Text className="text-zinc-400 text-[13px] flex-1 leading-5">{step[0]}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ==================== Helpers ====================
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-zinc-500 text-[11px] font-semibold uppercase tracking-wider mb-2 ml-1">
      {children}
    </Text>
  );
}

interface CredentialFieldProps {
  label: string;
  value: string;
  multiline?: boolean;
  copied: boolean;
  onCopy: () => void;
}

function CredentialField({ label, value, multiline, copied, onCopy }: CredentialFieldProps) {
  return (
    <View>
      <Text className="text-zinc-500 text-[11px] font-semibold uppercase tracking-wider mb-1.5">
        {label}
      </Text>
      <View
        className="flex-row items-start bg-zinc-950 border border-zinc-800/60 rounded-xl p-3"
        style={{ gap: 8 }}
      >
        <Text
          className="text-zinc-300 text-[11px] flex-1"
          style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}
          numberOfLines={multiline ? undefined : 1}
        >
          {value}
        </Text>
        <TouchableOpacity onPress={onCopy} activeOpacity={0.6} hitSlop={8}>
          {copied ? (
            <Check size={16} color="#34C759" />
          ) : (
            <Copy size={16} color="#8E8E93" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
