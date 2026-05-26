import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import {
  Plus,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Trash2,
  Filter,
} from 'lucide-react-native';

interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  bank: string;
  type: 'income' | 'expense';
  date: string;
}

const CATEGORIES = ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Salário', 'Educação', 'Outros'];
const BANKS = ['Nubank', 'Inter', 'Revolut', 'Itaú', 'Bradesco', 'Outro'];

const CATEGORY_COLORS: Record<string, string> = {
  'Alimentação': '#FF9500',
  'Transporte': '#007AFF',
  'Moradia': '#FF3B30',
  'Lazer': '#AF52DE',
  'Saúde': '#34C759',
  'Salário': '#5AC8FA',
  'Educação': '#FFCC00',
  'Outros': '#8E8E93',
};

export default function TransactionsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [bank, setBank] = useState(BANKS[0]);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [submitting, setSubmitting] = useState(false);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      let query = supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (filterType !== 'all') {
        query = query.eq('type', filterType);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTransactions(data || []);
    } catch (err: any) {
      console.warn('Error fetching transactions:', err.message);
    } finally {
      setLoading(false);
    }
  }, [filterType, user]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const openModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsModalOpen(true);
  };

  const handleAddTransaction = async () => {
    if (!amount || isNaN(parseFloat(amount.replace(',', '.')))) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Valor inválido', 'Por favor, insira um valor válido.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('transactions').insert({
        user_id: user?.id,
        amount: parseFloat(amount.replace(',', '.')),
        description: description || category,
        category,
        bank,
        type,
        date: new Date().toISOString(),
      });

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsModalOpen(false);
      setAmount('');
      setDescription('');
      setCategory(CATEGORIES[0]);
      setBank(BANKS[0]);
      setType('expense');
      fetchTransactions();
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Erro', err.message || 'Falha ao salvar transação.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTransaction = (id: string) => {
    Haptics.selectionAsync();
    Alert.alert('Apagar transação?', 'Essa ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('transactions').delete().eq('id', id);
            if (error) throw error;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            fetchTransactions();
          } catch (err: any) {
            Alert.alert('Erro', err.message || 'Erro ao deletar.');
          }
        },
      },
    ]);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <View className="flex-1 bg-black">
      {/* Header */}
      <View className="px-6 pt-14 pb-2 flex-row justify-between items-end">
        <Text className="text-white text-[28px] font-bold tracking-tight">Lançamentos</Text>
        <TouchableOpacity
          onPress={openModal}
          activeOpacity={0.85}
          className="items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#007AFF',
            shadowColor: '#007AFF',
            shadowOpacity: 0.3,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          <Plus size={18} color="white" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View className="px-6 py-4 flex-row" style={{ gap: 8 }}>
        <FilterChip
          label="Todos"
          active={filterType === 'all'}
          onPress={() => {
            Haptics.selectionAsync();
            setFilterType('all');
          }}
        />
        <FilterChip
          label="Entradas"
          icon={<ArrowUpRight size={13} color={filterType === 'income' ? '#34C759' : '#8E8E93'} />}
          active={filterType === 'income'}
          activeColor="#34C759"
          onPress={() => {
            Haptics.selectionAsync();
            setFilterType('income');
          }}
        />
        <FilterChip
          label="Saídas"
          icon={<ArrowDownLeft size={13} color={filterType === 'expense' ? '#FF3B30' : '#8E8E93'} />}
          active={filterType === 'expense'}
          activeColor="#FF3B30"
          onPress={() => {
            Haptics.selectionAsync();
            setFilterType('expense');
          }}
        />
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="small" color="#007AFF" />
        </View>
      ) : transactions.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
          <Filter size={36} color="#3A3A3C" />
          <Text className="text-zinc-300 text-[15px] font-semibold mt-3">
            Nenhum lançamento
          </Text>
          <Text className="text-zinc-500 text-[12px] text-center mt-1">
            Toque no botão + acima para registrar uma transação.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 100 }}
          className="flex-1 px-5 pt-2"
          showsVerticalScrollIndicator={false}
        >
          <View
            className="rounded-3xl overflow-hidden"
            style={{
              backgroundColor: '#1C1C1E',
              borderWidth: 1,
              borderColor: '#2C2C2E',
            }}
          >
            {transactions.map((tx, i) => (
              <View
                key={tx.id}
                className="px-4 py-3 flex-row items-center"
                style={{
                  borderBottomWidth: i !== transactions.length - 1 ? 0.5 : 0,
                  borderBottomColor: '#2C2C2E',
                }}
              >
                <View
                  className="items-center justify-center mr-3"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: (CATEGORY_COLORS[tx.category] || '#48484A') + '22',
                  }}
                >
                  <Text
                    className="font-bold text-[11px]"
                    style={{ color: CATEGORY_COLORS[tx.category] || '#8E8E93' }}
                  >
                    {tx.category.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1 mr-3">
                  <Text className="text-white text-[14px] font-medium" numberOfLines={1}>
                    {tx.description || tx.category}
                  </Text>
                  <Text className="text-zinc-500 text-[11px] mt-0.5">
                    {tx.bank ? `${tx.bank} • ` : ''}
                    {new Date(tx.date).toLocaleDateString('pt-BR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

                <Text
                  className={`font-semibold text-[14px] mr-2 ${
                    tx.type === 'income' ? 'text-green-500' : 'text-white'
                  }`}
                >
                  {tx.type === 'income' ? '+' : '−'}
                  {formatCurrency(Math.abs(tx.amount))}
                </Text>
                <TouchableOpacity
                  onPress={() => handleDeleteTransaction(tx.id)}
                  hitSlop={8}
                  activeOpacity={0.6}
                >
                  <Trash2 size={14} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* New transaction modal */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 bg-black"
        >
          <View className="flex-row justify-between items-center px-6 pt-5 pb-2">
            <Text className="text-white text-[20px] font-bold">Novo lançamento</Text>
            <TouchableOpacity
              onPress={() => setIsModalOpen(false)}
              activeOpacity={0.6}
              className="items-center justify-center"
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#1C1C1E',
              }}
            >
              <X size={16} color="white" />
            </TouchableOpacity>
          </View>

          <ScrollView
            className="flex-1 px-6 pt-4"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Type toggle */}
            <View
              className="flex-row rounded-2xl p-1 mb-6"
              style={{ backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#2C2C2E' }}
            >
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  setType('expense');
                }}
                className="flex-1 items-center justify-center"
                style={{
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor:
                    type === 'expense' ? 'rgba(255,59,48,0.12)' : 'transparent',
                }}
              >
                <Text
                  className="font-semibold text-[13px]"
                  style={{ color: type === 'expense' ? '#FF3B30' : '#8E8E93' }}
                >
                  Saída
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  setType('income');
                }}
                className="flex-1 items-center justify-center"
                style={{
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor:
                    type === 'income' ? 'rgba(52,199,89,0.12)' : 'transparent',
                }}
              >
                <Text
                  className="font-semibold text-[13px]"
                  style={{ color: type === 'income' ? '#34C759' : '#8E8E93' }}
                >
                  Entrada
                </Text>
              </TouchableOpacity>
            </View>

            {/* Amount */}
            <FieldLabel>Valor</FieldLabel>
            <View
              className="flex-row items-center rounded-2xl px-4 mb-5"
              style={{
                height: 70,
                backgroundColor: '#1C1C1E',
                borderWidth: 1,
                borderColor: '#2C2C2E',
              }}
            >
              <Text className="text-zinc-500 text-[24px] font-semibold mr-2">R$</Text>
              <TextInput
                placeholder="0,00"
                placeholderTextColor="#3A3A3C"
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
                style={{
                  flex: 1,
                  color: 'white',
                  fontSize: 32,
                  fontWeight: '700',
                  padding: 0,
                  height: '100%',
                  includeFontPadding: false,
                }}
              />
            </View>

            {/* Description */}
            <FieldLabel>Descrição</FieldLabel>
            <View
              className="flex-row items-center rounded-2xl px-4 mb-5"
              style={{
                height: 52,
                backgroundColor: '#1C1C1E',
                borderWidth: 1,
                borderColor: '#2C2C2E',
              }}
            >
              <TextInput
                placeholder="ex: Mercado, Cinema, PIX recebido"
                placeholderTextColor="#636366"
                value={description}
                onChangeText={setDescription}
                style={{
                  flex: 1,
                  color: 'white',
                  fontSize: 15,
                  padding: 0,
                  height: '100%',
                  includeFontPadding: false,
                }}
              />
            </View>

            {/* Category */}
            <FieldLabel>Categoria</FieldLabel>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 16 }}
              className="mb-5"
            >
              {CATEGORIES.map((cat) => {
                const selected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setCategory(cat);
                    }}
                    activeOpacity={0.7}
                    className="px-4 py-2.5 rounded-full mr-2"
                    style={{
                      backgroundColor: selected ? '#007AFF' : '#1C1C1E',
                      borderWidth: 1,
                      borderColor: selected ? '#007AFF' : '#2C2C2E',
                    }}
                  >
                    <Text
                      className="text-[13px] font-semibold"
                      style={{ color: selected ? 'white' : '#8E8E93' }}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Bank */}
            <FieldLabel>Banco / Origem</FieldLabel>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 16 }}
              className="mb-8"
            >
              {BANKS.map((b) => {
                const selected = bank === b;
                return (
                  <TouchableOpacity
                    key={b}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setBank(b);
                    }}
                    activeOpacity={0.7}
                    className="px-4 py-2.5 rounded-full mr-2"
                    style={{
                      backgroundColor: selected ? '#1C1C1E' : 'transparent',
                      borderWidth: 1,
                      borderColor: selected ? '#48484A' : '#2C2C2E',
                    }}
                  >
                    <Text
                      className="text-[13px] font-semibold"
                      style={{ color: selected ? 'white' : '#8E8E93' }}
                    >
                      {b}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              onPress={handleAddTransaction}
              disabled={submitting}
              activeOpacity={0.85}
              className="rounded-2xl items-center justify-center mb-10"
              style={{
                height: 52,
                backgroundColor: '#007AFF',
                shadowColor: '#007AFF',
                shadowOpacity: 0.3,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
              }}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-[15px]">
                  Salvar lançamento
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ==================== Helpers ====================
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-zinc-500 text-[11px] font-semibold uppercase tracking-wider mb-2 ml-1">
      {children}
    </Text>
  );
}

interface FilterChipProps {
  label: string;
  icon?: React.ReactNode;
  active: boolean;
  activeColor?: string;
  onPress: () => void;
}

function FilterChip({ label, icon, active, activeColor = '#FFFFFF', onPress }: FilterChipProps) {
  const bgColor = active
    ? activeColor === '#FFFFFF'
      ? '#1C1C1E'
      : `${activeColor}1A`
    : 'transparent';
  const borderColor = active && activeColor !== '#FFFFFF' ? `${activeColor}33` : '#2C2C2E';
  const textColor = active ? activeColor : '#8E8E93';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="flex-row items-center px-3.5 py-2 rounded-full"
      style={{
        backgroundColor: bgColor,
        borderWidth: 1,
        borderColor,
        gap: 6,
      }}
    >
      {icon}
      <Text className="text-[13px] font-semibold" style={{ color: textColor }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
