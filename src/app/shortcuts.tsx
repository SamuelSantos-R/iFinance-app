import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Clipboard, Share } from 'react-native';
import { useAuth } from '@/context/auth-context';
import { ShieldCheck, Copy, Share2, Smartphone, Landmark, HelpCircle, ArrowRight, Check } from 'lucide-react-native';

const BANKS_LIST = [
  { id: 'nubank', name: 'Nubank', icon: '🟣', active: true },
  { id: 'inter', name: 'Banco Inter', icon: '🟠', active: true },
  { id: 'revolut', name: 'Revolut', icon: '⚪', active: true },
  { id: 'itau', name: 'Itaú', icon: '🟡', active: false },
  { id: 'bradesco', name: 'Bradesco', icon: '🔴', active: false },
];

export default function ShortcutsScreen() {
  const { profile } = useAuth();
  const [selectedBanks, setSelectedBanks] = useState<string[]>(['nubank', 'inter', 'revolut']);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-supabase-url.supabase.co';
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
  const rpcUrl = `${supabaseUrl}/rest/v1/rpc/add_transaction_via_shortcut?apikey=${supabaseAnonKey}`;
  const apiKey = profile?.shortcut_api_key || 'Carregando chave de API...';

  const toggleBank = (id: string) => {
    if (selectedBanks.includes(id)) {
      setSelectedBanks(selectedBanks.filter(b => b !== id));
    } else {
      setSelectedBanks([...selectedBanks, id]);
    }
  };

  const copyToClipboard = (text: string, type: 'url' | 'key') => {
    Clipboard.setString(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
    Alert.alert('Copiado', 'Copiado para a área de transferência!');
  };

  const shareShortcutTemplate = async () => {
    try {
      const message = `iFinance Shortcut API Config:\n\nURL: ${rpcUrl}\n\nKey: ${apiKey}\n\nConfigure no app Atalhos do seu iPhone!`;
      await Share.share({ message });
    } catch (error: any) {
      console.error(error);
    }
  };

  return (
    <View className="flex-1 bg-black">
      {/* Header */}
      <View className="px-6 pt-14 pb-4 border-b border-zinc-900">
        <Text className="text-zinc-500 text-xs font-semibold uppercase tracking-wider font-rounded">Integração</Text>
        <Text className="text-white text-2xl font-bold font-rounded">iOS Shortcuts</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} className="flex-1 px-6 pt-6">
        {/* Intro */}
        <View className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 mb-6">
          <View className="flex-row items-center mb-3">
            <Smartphone size={24} color="#007AFF" className="mr-3" />
            <Text className="text-white text-base font-bold font-rounded">Como Funciona?</Text>
          </View>
          <Text className="text-zinc-400 text-sm leading-relaxed font-rounded">
            O aplicativo do seu banco envia uma notificação de compra. O app <Text className="text-white font-semibold">Atalhos (Shortcuts)</Text> do iOS captura a notificação, pergunta a categoria e registra o lançamento automaticamente na sua base de dados do Supabase.
          </Text>
        </View>

        {/* Bank Selection */}
        <Text className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3 font-rounded">1. Bancos Monitorados</Text>
        <View className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 mb-6">
          <Text className="text-zinc-400 text-xs font-rounded mb-4">
            Selecione os bancos dos quais você recebe notificações de despesa ou receita:
          </Text>
          
          <View className="space-y-2 gap-2">
            {BANKS_LIST.map((bank) => {
              const isSelected = selectedBanks.includes(bank.id);
              return (
                <TouchableOpacity
                  key={bank.id}
                  onPress={() => toggleBank(bank.id)}
                  className={`flex-row items-center justify-between p-3 rounded-2xl border ${
                    isSelected ? 'bg-zinc-950 border-blue-500/30' : 'bg-zinc-950/40 border-zinc-900'
                  }`}
                >
                  <View className="flex-row items-center">
                    <Text className="text-lg mr-3">{bank.icon}</Text>
                    <Text className={`font-semibold font-rounded text-sm ${isSelected ? 'text-white' : 'text-zinc-500'}`}>
                      {bank.name}
                    </Text>
                  </View>
                  <View className={`w-5 h-5 rounded-full items-center justify-center ${isSelected ? 'bg-blue-600' : 'bg-zinc-800'}`}>
                    {isSelected && <Check size={12} color="white" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Credentials */}
        <Text className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3 font-rounded">2. Credenciais do Atalho</Text>
        <View className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 mb-6">
          <Text className="text-zinc-400 text-xs font-rounded mb-4">
            Use estes dados para configurar a requisição HTTP POST no aplicativo Atalhos:
          </Text>

          {/* URL */}
          <Text className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1 font-rounded">Endereço (URL API)</Text>
          <View className="flex-row items-center bg-zinc-950 border border-zinc-800 rounded-xl p-3 mb-4">
            <Text className="text-zinc-400 text-xs flex-1 font-mono" numberOfLines={1}>
              {rpcUrl}
            </Text>
            <TouchableOpacity onPress={() => copyToClipboard(rpcUrl, 'url')} className="ml-2 p-1">
              <Copy size={16} color={copiedUrl ? '#34C759' : '#007AFF'} />
            </TouchableOpacity>
          </View>

          {/* Key */}
          <Text className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1 font-rounded font-rounded">Sua Chave de API Pessoal (api_key)</Text>
          <View className="flex-row items-center bg-zinc-950 border border-zinc-800 rounded-xl p-3 mb-6">
            <Text className="text-zinc-400 text-xs flex-1 font-mono" numberOfLines={1}>
              {apiKey}
            </Text>
            <TouchableOpacity onPress={() => copyToClipboard(apiKey, 'key')} className="ml-2 p-1">
              <Copy size={16} color={copiedKey ? '#34C759' : '#007AFF'} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={shareShortcutTemplate}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-3 flex-row items-center justify-center active:bg-zinc-850"
          >
            <Share2 size={16} color="white" className="mr-2" />
            <Text className="text-white font-semibold text-sm font-rounded">Compartilhar Configurações</Text>
          </TouchableOpacity>
        </View>

        {/* Tutorial */}
        <Text className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3 font-rounded">3. Como Configurar no iOS</Text>
        <View className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5">
          <View className="space-y-4 gap-4">
            <View className="flex-row">
              <View className="w-6 h-6 rounded-full bg-blue-600/10 border border-blue-500/20 items-center justify-center mr-3 mt-0.5">
                <Text className="text-blue-500 font-bold text-xs">1</Text>
              </View>
              <Text className="text-zinc-400 text-sm flex-1 font-rounded">
                Abra o app <Text className="text-white font-semibold">Atalhos</Text> no seu iPhone e crie uma nova <Text className="text-white font-semibold">Automação Pessoal</Text>.
              </Text>
            </View>

            <View className="flex-row">
              <View className="w-6 h-6 rounded-full bg-blue-600/10 border border-blue-500/20 items-center justify-center mr-3 mt-0.5">
                <Text className="text-blue-500 font-bold text-xs">2</Text>
              </View>
              <Text className="text-zinc-400 text-sm flex-1 font-rounded">
                Escolha o gatilho <Text className="text-white font-semibold">"Notificação"</Text>, selecione os apps selecionados acima (ex: Nubank) e marque "Contém" <Text className="text-white font-semibold">"compra" ou "gasto"</Text>.
              </Text>
            </View>

            <View className="flex-row">
              <View className="w-6 h-6 rounded-full bg-blue-600/10 border border-blue-500/20 items-center justify-center mr-3 mt-0.5">
                <Text className="text-blue-500 font-bold text-xs">3</Text>
              </View>
              <Text className="text-zinc-400 text-sm flex-1 font-rounded">
                No fluxo da automação, adicione a ação <Text className="text-white font-semibold">"Obter Texto de Notificação"</Text> e use Regex/Fórmulas simples para extrair o <Text className="text-white font-semibold">valor</Text>.
              </Text>
            </View>

            <View className="flex-row">
              <View className="w-6 h-6 rounded-full bg-blue-600/10 border border-blue-500/20 items-center justify-center mr-3 mt-0.5">
                <Text className="text-blue-500 font-bold text-xs">4</Text>
              </View>
              <Text className="text-zinc-400 text-sm flex-1 font-rounded">
                Adicione a ação <Text className="text-white font-semibold">"Escolher do Menu"</Text> para o usuário selecionar a categoria (Alimentação, Transporte, Lazer, etc).
              </Text>
            </View>

            <View className="flex-row">
              <View className="w-6 h-6 rounded-full bg-blue-600/10 border border-blue-500/20 items-center justify-center mr-3 mt-0.5">
                <Text className="text-blue-500 font-bold text-xs">5</Text>
              </View>
              <Text className="text-zinc-400 text-sm flex-1 font-rounded">
                Por fim, insira a ação <Text className="text-white font-semibold">"Obter Conteúdo da URL"</Text>. Configure como <Text className="text-white font-semibold">POST</Text> e insira a URL copiada acima (que já contém a chave de acesso integrada!).
              </Text>
            </View>

            <View className="flex-row">
              <View className="w-6 h-6 rounded-full bg-blue-600/10 border border-blue-500/20 items-center justify-center mr-3 mt-0.5">
                <Text className="text-blue-500 font-bold text-xs">6</Text>
              </View>
              <Text className="text-zinc-400 text-sm flex-1 font-rounded">
                No corpo JSON da requisição, envie:
                {'\n'}• <Text className="text-white font-semibold">api_key_param</Text>: sua chave de api pessoal
                {'\n'}• <Text className="text-white font-semibold">amount_param</Text>: valor extraído
                {'\n'}• <Text className="text-white font-semibold">category_param</Text>: categoria selecionada
                {'\n'}• <Text className="text-white font-semibold">bank_param</Text>: nome do banco
                {'\n'}• <Text className="text-white font-semibold">description_param</Text>: descrição do gasto
                {'\n'}• <Text className="text-white font-semibold">type_param</Text>: 'expense'
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
