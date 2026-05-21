import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Smartphone,
  Bell,
  ArrowUpRight,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { CategoryPieChart, type CategorySlice } from '@/components/category-pie-chart';

interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  bank: string;
  type: 'income' | 'expense';
  date: string;
}

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

export default function DashboardScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);

  const fetchTransactions = async () => {
    if (!user) return;
    try {
      const { data: recent } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })
        .limit(20);
      setTransactions(recent || []);

      const { data: all } = await supabase
        .from('transactions')
        .select('amount, type, category')
        .order('date', { ascending: false });
      setAllTransactions((all as Transaction[]) || []);
    } catch (err) {
      console.warn('Error fetching dashboard data:', err);
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

  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    allTransactions.forEach((tx) => {
      const amt = Math.abs(parseFloat(tx.amount as any));
      if (tx.type === 'income') income += amt;
      else expense += amt;
    });
    return { income, expense, balance: income - expense };
  }, [allTransactions]);

  const pieData = useMemo<CategorySlice[]>(() => {
    const byCategory = new Map<string, number>();
    allTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const amt = Math.abs(parseFloat(t.amount as any));
        byCategory.set(t.category, (byCategory.get(t.category) || 0) + amt);
      });
    return Array.from(byCategory.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({
        category,
        amount,
        color: CATEGORY_COLORS[category] || '#48484A',
      }));
  }, [allTransactions]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatCurrencyShort = (value: number) => {
    if (value >= 10000) return `R$ ${(value / 1000).toFixed(1)}k`;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <View className="flex-1 bg-black">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />
        }
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View className="px-6 pt-14 pb-3 flex-row justify-between items-center">
          <View>
            <Text className="text-zinc-500 text-[12px] font-medium">
              {greetingByHour()},
            </Text>
            <Text className="text-white text-[22px] font-bold tracking-tight mt-0.5">
              {profile?.full_name?.split(' ')[0] || 'Usuário'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/profile')}
            activeOpacity={0.7}
            className="overflow-hidden items-center justify-center"
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#1C1C1E',
              borderWidth: 1,
              borderColor: '#2C2C2E',
            }}
          >
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <Text className="text-white font-semibold text-[14px]">
                {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View className="px-5 mt-3">
          <View
            className="rounded-3xl p-6"
            style={{
              backgroundColor: '#1C1C1E',
              borderWidth: 1,
              borderColor: '#2C2C2E',
            }}
          >
            <Text className="text-zinc-500 text-[12px] font-medium">Saldo total</Text>
            <Text className="text-white text-[34px] font-bold tracking-tight mt-1">
              {formatCurrency(stats.balance)}
            </Text>

            <View className="flex-row mt-5 gap-3">
              <View className="flex-1 bg-black/30 rounded-2xl p-3">
                <View className="flex-row items-center" style={{ gap: 6 }}>
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: 'rgba(52,199,89,0.15)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <TrendingUp size={11} color="#34C759" strokeWidth={2.5} />
                  </View>
                  <Text className="text-zinc-400 text-[11px]">Entradas</Text>
                </View>
                <Text
                  className="text-green-500 font-semibold text-[15px] mt-1"
                  numberOfLines={1}
                >
                  {formatCurrencyShort(stats.income)}
                </Text>
              </View>

              <View className="flex-1 bg-black/30 rounded-2xl p-3">
                <View className="flex-row items-center" style={{ gap: 6 }}>
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: 'rgba(255,59,48,0.15)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <TrendingDown size={11} color="#FF3B30" strokeWidth={2.5} />
                  </View>
                  <Text className="text-zinc-400 text-[11px]">Saídas</Text>
                </View>
                <Text
                  className="text-red-500 font-semibold text-[15px] mt-1"
                  numberOfLines={1}
                >
                  {formatCurrencyShort(stats.expense)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Pie chart */}
        {pieData.length > 0 && (
          <View className="px-5 mt-4">
            <View
              className="rounded-3xl p-5"
              style={{
                backgroundColor: '#1C1C1E',
                borderWidth: 1,
                borderColor: '#2C2C2E',
              }}
            >
              <Text className="text-white text-[16px] font-semibold mb-4">
                Gastos por categoria
              </Text>
              <View className="flex-row items-center">
                <CategoryPieChart
                  data={pieData}
                  total={stats.expense}
                  formatTotal={formatCurrencyShort}
                  size={150}
                  thickness={22}
                />
                <View className="flex-1 ml-5 gap-2.5">
                  {pieData.slice(0, 5).map((slice) => {
                    const percent = ((slice.amount / stats.expense) * 100).toFixed(0);
                    return (
                      <View key={slice.category} className="flex-row items-center justify-between">
                        <View className="flex-row items-center flex-1">
                          <View
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: slice.color,
                              marginRight: 8,
                            }}
                          />
                          <Text
                            className="text-zinc-300 text-[12px] flex-1"
                            numberOfLines={1}
                          >
                            {slice.category}
                          </Text>
                        </View>
                        <Text className="text-zinc-500 text-[12px] font-medium">
                          {percent}%
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Shortcut promo */}
        <View className="px-5 mt-4">
          <TouchableOpacity
            onPress={() => router.push('/shortcuts')}
            activeOpacity={0.75}
            className="rounded-3xl p-5 flex-row items-center"
            style={{
              backgroundColor: 'rgba(0,122,255,0.08)',
              borderWidth: 1,
              borderColor: 'rgba(0,122,255,0.2)',
            }}
          >
            <View
              className="items-center justify-center"
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: 'rgba(0,122,255,0.15)',
              }}
            >
              <Bell size={18} color="#007AFF" />
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-white text-[14px] font-semibold">
                Configure os Atalhos do iOS
              </Text>
              <Text className="text-zinc-400 text-[12px] mt-0.5">
                Gastos registrados automaticamente pela notificação.
              </Text>
            </View>
            <ArrowUpRight size={16} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Add transaction CTA */}
        <View className="px-5 mt-4">
          <TouchableOpacity
            onPress={() => router.push('/transactions')}
            activeOpacity={0.75}
            className="rounded-2xl py-4 flex-row items-center justify-center"
            style={{
              backgroundColor: '#1C1C1E',
              borderWidth: 1,
              borderColor: '#2C2C2E',
              gap: 8,
            }}
          >
            <Plus size={18} color="#007AFF" />
            <Text className="text-white text-[14px] font-semibold">Novo lançamento</Text>
          </TouchableOpacity>
        </View>

        {/* Recent */}
        <View className="px-5 mt-6 mb-3 flex-row justify-between items-center">
          <Text className="text-white text-[16px] font-semibold">Atividades recentes</Text>
          <TouchableOpacity onPress={() => router.push('/transactions')} activeOpacity={0.6}>
            <Text className="text-blue-500 text-[13px] font-semibold">Ver todas</Text>
          </TouchableOpacity>
        </View>

        <View className="px-5">
          {loading ? (
            <ActivityIndicator size="small" color="#007AFF" style={{ marginVertical: 30 }} />
          ) : transactions.length === 0 ? (
            <View
              className="rounded-3xl p-8 items-center"
              style={{
                backgroundColor: '#1C1C1E',
                borderWidth: 1,
                borderColor: '#2C2C2E',
              }}
            >
              <Text className="text-zinc-300 text-[15px] font-semibold">
                Nenhuma transação ainda
              </Text>
              <Text className="text-zinc-500 text-[12px] mt-1 text-center">
                Registre um lançamento manual ou configure{'\n'}os atalhos para começar.
              </Text>
            </View>
          ) : (
            <View
              className="rounded-3xl overflow-hidden"
              style={{
                backgroundColor: '#1C1C1E',
                borderWidth: 1,
                borderColor: '#2C2C2E',
              }}
            >
              {transactions.slice(0, 6).map((tx, i) => (
                <View
                  key={tx.id}
                  className="px-4 py-3 flex-row items-center"
                  style={{
                    borderBottomWidth: i !== Math.min(5, transactions.length - 1) ? 0.5 : 0,
                    borderBottomColor: '#2C2C2E',
                  }}
                >
                  <View
                    className="items-center justify-center mr-3"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      backgroundColor:
                        (CATEGORY_COLORS[tx.category] || '#48484A') + '22',
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
                      })}
                    </Text>
                  </View>
                  <Text
                    className={`font-semibold text-[14px] ${
                      tx.type === 'income' ? 'text-green-500' : 'text-white'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '−'}
                    {formatCurrency(Math.abs(tx.amount))}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function greetingByHour() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}
