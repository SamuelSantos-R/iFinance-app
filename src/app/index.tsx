import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { TrendingUp, TrendingDown, Wallet, Plus, RefreshCw, Smartphone, DollarSign, Bell } from 'lucide-react-native';
import { Link, useRouter } from 'expo-router';

interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  bank: string;
  type: 'income' | 'expense';
  date: string;
}

export default function DashboardScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({
    balance: 0,
    income: 0,
    expense: 0,
  });

  const fetchTransactions = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (data) {
        setTransactions(data);
        
        // Calculate stats
        let totalIncome = 0;
        let totalExpense = 0;
        
        data.forEach((tx: any) => {
          const amt = parseFloat(tx.amount);
          if (tx.type === 'income') {
            totalIncome += amt;
          } else {
            totalExpense += amt;
          }
        });

        // Normally we'd sum all transactions, but for demonstration/recent items:
        // Let's do a separate query or sum these. Let's do a full sum query to be accurate.
        const { data: allData, error: allErr } = await supabase
          .from('transactions')
          .select('amount, type');
          
        if (!allErr && allData) {
          let sumIncome = 0;
          let sumExpense = 0;
          allData.forEach((tx: any) => {
            const amt = parseFloat(tx.amount);
            if (tx.type === 'income') {
              sumIncome += amt;
            } else {
              sumExpense += amt;
            }
          });
          setStats({
            income: sumIncome,
            expense: sumExpense,
            balance: sumIncome - sumExpense,
          });
        } else {
          setStats({
            income: totalIncome,
            expense: totalExpense,
            balance: totalIncome - totalExpense,
          });
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTransactions();
  }, [user]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getCategoryColor = (category: string) => {
    const cats: { [key: string]: string } = {
      'Alimentação': 'bg-amber-500/10 text-amber-500',
      'Transporte': 'bg-blue-500/10 text-blue-500',
      'Moradia': 'bg-red-500/10 text-red-500',
      'Lazer': 'bg-purple-500/10 text-purple-500',
      'Saúde': 'bg-green-500/10 text-green-500',
      'Salário': 'bg-emerald-500/10 text-emerald-500',
      'Educação': 'bg-indigo-500/10 text-indigo-500',
      'Outros': 'bg-gray-500/10 text-gray-500',
    };
    return cats[category] || 'bg-zinc-500/10 text-zinc-400';
  };

  return (
    <View className="flex-1 bg-black">
      {/* Top Header */}
      <View className="px-6 pt-14 pb-4 flex-row justify-between items-center border-b border-zinc-900">
        <View>
          <Text className="text-zinc-500 text-xs font-semibold uppercase tracking-wider font-rounded">Bem-vindo de volta,</Text>
          <Text className="text-white text-2xl font-bold font-rounded">
            {profile?.full_name || 'Usuário'}
          </Text>
        </View>
        <TouchableOpacity 
          onPress={() => router.push('/profile')}
          className="w-10 h-10 rounded-full bg-zinc-800 items-center justify-center overflow-hidden border border-zinc-700"
        >
          {profile?.avatar_url ? (
            <RefreshCw size={18} color="white" /> // Profile photo loaded in background or placeholder
          ) : (
            <Text className="text-white font-bold text-sm">
              {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />
        }
        className="flex-1 px-6 pt-6"
      >
        {/* Balance Card */}
        <View className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mb-6 shadow-xl relative overflow-hidden">
          <View className="absolute -right-8 -top-8 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl" />
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-zinc-400 text-sm font-medium font-rounded">Saldo Total</Text>
            <Wallet size={20} color="#007AFF" />
          </View>
          <Text className="text-white text-3xl font-black font-rounded tracking-tight mb-6">
            {formatCurrency(stats.balance)}
          </Text>

          <View className="flex-row justify-between border-t border-zinc-800/80 pt-4">
            <View className="flex-1 mr-2">
              <View className="flex-row items-center mb-1">
                <View className="w-5 h-5 bg-green-500/10 rounded-full items-center justify-center mr-1.5">
                  <TrendingUp size={12} color="#34C759" />
                </View>
                <Text className="text-zinc-400 text-xs font-rounded">Receitas</Text>
              </View>
              <Text className="text-green-500 font-bold text-base font-rounded" numberOfLines={1}>
                {formatCurrency(stats.income)}
              </Text>
            </View>

            <View className="w-px bg-zinc-800" />

            <View className="flex-1 ml-4">
              <View className="flex-row items-center mb-1">
                <View className="w-5 h-5 bg-red-500/10 rounded-full items-center justify-center mr-1.5">
                  <TrendingDown size={12} color="#FF3B30" />
                </View>
                <Text className="text-zinc-400 text-xs font-rounded">Despesas</Text>
              </View>
              <Text className="text-red-500 font-bold text-base font-rounded" numberOfLines={1}>
                {formatCurrency(stats.expense)}
              </Text>
            </View>
          </View>
        </View>

        {/* Shortcuts / Notification Banner */}
        <TouchableOpacity
          onPress={() => router.push('/shortcuts')}
          className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-800/30 rounded-3xl p-5 mb-6 flex-row items-center justify-between"
        >
          <View className="flex-1 mr-3">
            <View className="flex-row items-center mb-1">
              <Smartphone size={16} color="#007AFF" className="mr-1.5" />
              <Text className="text-blue-400 text-xs font-bold font-rounded">Shortcuts Integrados</Text>
            </View>
            <Text className="text-white text-sm font-semibold font-rounded">
              Registre gastos via notificações bancárias!
            </Text>
            <Text className="text-zinc-400 text-xs mt-1 font-rounded">
              Configure Nubank, Inter, Revolut e economize tempo.
            </Text>
          </View>
          <View className="w-10 h-10 bg-blue-500/10 rounded-2xl items-center justify-center">
            <Bell size={20} color="#007AFF" />
          </View>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View className="flex-row justify-between mb-8 gap-4">
          <TouchableOpacity
            onPress={() => router.push('/transactions')}
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl py-3.5 flex-row items-center justify-center active:bg-zinc-850"
          >
            <Plus size={18} color="#007AFF" className="mr-2" />
            <Text className="text-white font-semibold text-sm font-rounded">Novo Registro</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Transactions List */}
        <View className="mb-4 flex-row justify-between items-center">
          <Text className="text-white text-lg font-bold font-rounded">Atividades Recentes</Text>
          <Link href="/transactions" asChild>
            <TouchableOpacity>
              <Text className="text-blue-500 text-xs font-semibold font-rounded">Ver todas</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color="#007AFF" className="my-8" />
        ) : transactions.length === 0 ? (
          <View className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 items-center justify-center">
            <DollarSign size={32} color="#48484A" className="mb-2" />
            <Text className="text-zinc-400 text-center font-rounded text-sm">
              Nenhuma transação encontrada.
            </Text>
            <Text className="text-zinc-500 text-center font-rounded text-xs mt-1">
              Registre uma transação ou configure os Shortcuts para começar.
            </Text>
          </View>
        ) : (
          <View className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden divide-y divide-zinc-800/80">
            {transactions.slice(0, 5).map((tx) => (
              <View key={tx.id} className="p-4 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 mr-3">
                  <View className={`w-10 h-10 rounded-2xl items-center justify-center mr-3 ${getCategoryColor(tx.category)}`}>
                    <Text className="font-bold text-xs">
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
                      })}
                    </Text>
                  </View>
                </View>
                <Text
                  className={`font-bold font-rounded text-base ${
                    tx.type === 'income' ? 'text-green-500' : 'text-white'
                  }`}
                >
                  {tx.type === 'income' ? '+' : '-'} {formatCurrency(Math.abs(tx.amount))}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
