import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { Plus, X, ArrowUpRight, ArrowDownLeft, Trash2, Calendar, Filter } from 'lucide-react-native';

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

export default function TransactionsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  // Form states
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [bank, setBank] = useState(BANKS[0]);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [submitting, setSubmitting] = useState(false);

  const fetchTransactions = async () => {
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
      console.error('Error fetching transactions:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [user, filterType]);

  const handleAddTransaction = async () => {
    if (!amount || isNaN(parseFloat(amount))) {
      Alert.alert('Erro', 'Por favor, insira um valor válido.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('transactions').insert({
        user_id: user?.id,
        amount: parseFloat(amount),
        description: description || category,
        category,
        bank,
        type,
        date: new Date().toISOString(),
      });

      if (error) throw error;

      Alert.alert('Sucesso', 'Transação registrada com sucesso!');
      setIsModalOpen(false);
      
      // Reset form
      setAmount('');
      setDescription('');
      setCategory(CATEGORIES[0]);
      setBank(BANKS[0]);
      setType('expense');
      
      fetchTransactions();
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao salvar transação.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTransaction = (id: string) => {
    Alert.alert('Confirmar Exclusão', 'Deseja realmente apagar esta transação?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('transactions').delete().eq('id', id);
            if (error) throw error;
            fetchTransactions();
          } catch (err: any) {
            Alert.alert('Erro', err.message || 'Erro ao deletar.');
          }
        },
      },
    ]);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <View className="flex-1 bg-black">
      {/* Header */}
      <View className="px-6 pt-14 pb-4 flex-row justify-between items-center border-b border-zinc-900">
        <Text className="text-white text-2xl font-bold font-rounded">Lançamentos</Text>
        <TouchableOpacity
          onPress={() => setIsModalOpen(true)}
          className="w-10 h-10 rounded-full bg-blue-600 items-center justify-center shadow-lg shadow-blue-500/20"
        >
          <Plus size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View className="px-6 py-4 flex-row space-x-2 gap-2 border-b border-zinc-900">
        <TouchableOpacity
          onPress={() => setFilterType('all')}
          className={`px-4 py-2 rounded-full ${
            filterType === 'all' ? 'bg-zinc-800 border border-zinc-700' : 'bg-transparent'
          }`}
        >
          <Text className={`text-sm font-semibold font-rounded ${filterType === 'all' ? 'text-white' : 'text-zinc-500'}`}>
            Todos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setFilterType('income')}
          className={`px-4 py-2 rounded-full flex-row items-center gap-1.5 ${
            filterType === 'income' ? 'bg-green-500/10 border border-green-500/30' : 'bg-transparent'
          }`}
        >
          <ArrowUpRight size={14} color={filterType === 'income' ? '#34C759' : '#8E8E93'} />
          <Text className={`text-sm font-semibold font-rounded ${filterType === 'income' ? 'text-green-500' : 'text-zinc-500'}`}>
            Entradas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setFilterType('expense')}
          className={`px-4 py-2 rounded-full flex-row items-center gap-1.5 ${
            filterType === 'expense' ? 'bg-red-500/10 border border-red-500/30' : 'bg-transparent'
          }`}
        >
          <ArrowDownLeft size={14} color={filterType === 'expense' ? '#FF3B30' : '#8E8E93'} />
          <Text className={`text-sm font-semibold font-rounded ${filterType === 'expense' ? 'text-red-500' : 'text-zinc-500'}`}>
            Saídas
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main List */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : transactions.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
          <Filter size={40} color="#3A3A3C" className="mb-3" />
          <Text className="text-zinc-400 text-base text-center font-rounded">Nenhum lançamento encontrado</Text>
          <Text className="text-zinc-600 text-xs text-center font-rounded mt-1">
            Toque no botão "+" no topo para registrar uma nova transação.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }} className="flex-1 px-6 pt-4">
          <View className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden divide-y divide-zinc-800/80">
            {transactions.map((tx) => (
              <View key={tx.id} className="p-4 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 mr-3">
                  <View className={`w-10 h-10 rounded-2xl items-center justify-center mr-3 bg-zinc-800 border border-zinc-700`}>
                    <Text className="text-zinc-400 font-bold text-xs">
                      {tx.category.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-semibold text-sm font-rounded" numberOfLines={1}>
                      {tx.description || tx.category}
                    </Text>
                    <Text className="text-zinc-400 text-xs font-rounded mt-0.5">
                      {tx.bank ? `${tx.bank} • ` : ''}
                      {new Date(tx.date).toLocaleDateString('pt-BR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>
                
                <View className="flex-row items-center space-x-3 gap-3">
                  <Text
                    className={`font-bold font-rounded text-base ${
                      tx.type === 'income' ? 'text-green-500' : 'text-white'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'} {formatCurrency(Math.abs(tx.amount))}
                  </Text>
                  <TouchableOpacity onPress={() => handleDeleteTransaction(tx.id)} className="p-1">
                    <Trash2 size={16} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Manual Input Modal */}
      <Modal visible={isModalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsModalOpen(false)}>
        <View className="flex-1 bg-black px-6 pt-6">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-white text-xl font-bold font-rounded">Novo Registro</Text>
            <TouchableOpacity onPress={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-zinc-900 items-center justify-center">
              <X size={18} color="white" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1">
            {/* Type Toggle */}
            <View className="flex-row bg-zinc-900 p-1.5 rounded-2xl mb-6">
              <TouchableOpacity
                onPress={() => setType('expense')}
                className={`flex-1 py-3 rounded-xl items-center ${
                  type === 'expense' ? 'bg-red-500/10 border border-red-500/20' : 'bg-transparent'
                }`}
              >
                <Text className={`font-bold font-rounded text-sm ${type === 'expense' ? 'text-red-500' : 'text-zinc-500'}`}>
                  Despesa (Saída)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setType('income')}
                className={`flex-1 py-3 rounded-xl items-center ${
                  type === 'income' ? 'bg-green-500/10 border border-green-500/20' : 'bg-transparent'
                }`}
              >
                <Text className={`font-bold font-rounded text-sm ${type === 'income' ? 'text-green-500' : 'text-zinc-500'}`}>
                  Receita (Entrada)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Amount input */}
            <Text className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2 font-rounded">Valor (R$)</Text>
            <View className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4 flex-row items-center">
              <Text className="text-white text-3xl font-black mr-2 font-rounded">R$</Text>
              <TextInput
                placeholder="0,00"
                placeholderTextColor="#48484A"
                keyboardType="numeric"
                className="text-white text-3xl font-black flex-1 font-rounded h-10"
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            {/* Description */}
            <Text className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2 font-rounded">Descrição</Text>
            <TextInput
              placeholder="ex: Compras de mercado, Cinema, PIX recebido"
              placeholderTextColor="#48484A"
              className="bg-zinc-900 border border-zinc-800 text-white rounded-2xl p-4 text-base font-rounded mb-4 h-14"
              value={description}
              onChangeText={setDescription}
            />

            {/* Category Select */}
            <Text className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2 font-rounded">Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-4">
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  className={`px-4 py-2.5 rounded-full mr-2 border ${
                    category === cat ? 'bg-blue-600 border-blue-500' : 'bg-zinc-900 border-zinc-800'
                  }`}
                >
                  <Text className={`text-sm font-semibold font-rounded ${category === cat ? 'text-white' : 'text-zinc-400'}`}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Bank Select */}
            <Text className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2 font-rounded">Banco / Origem</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-8">
              {BANKS.map((b) => (
                <TouchableOpacity
                  key={b}
                  onPress={() => setBank(b)}
                  className={`px-4 py-2.5 rounded-full mr-2 border ${
                    bank === b ? 'bg-purple-600 border-purple-500' : 'bg-zinc-900 border-zinc-800'
                  }`}
                >
                  <Text className={`text-sm font-semibold font-rounded ${bank === b ? 'text-white' : 'text-zinc-400'}`}>
                    {b}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleAddTransaction}
              disabled={submitting}
              className="w-full bg-blue-600 rounded-2xl py-4 items-center justify-center mb-10 shadow-lg shadow-blue-500/20 active:bg-blue-700"
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base font-rounded">Salvar Lançamento</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
