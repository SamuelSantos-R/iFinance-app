import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { CategoryPieChart, type CategorySlice } from '@/components/category-pie-chart';
import { GlassSurface } from '@/components/glass-surface';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';

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
  Alimentação: '#FF9F0A',
  Transporte: '#0A84FF',
  Moradia: '#FF453A',
  Lazer: '#BF5AF2',
  Saúde: '#30D158',
  Salário: '#64D2FF',
  Educação: '#FFD60A',
  Outros: '#8E8E93',
};

export default function DashboardScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);

  const fetchTransactions = useCallback(async () => {
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
  }, [user]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTransactions();
  }, [fetchTransactions]);

  const monthlyTransactions = useMemo(() => {
    const now = new Date();
    return allTransactions.filter((transaction) => {
      const date = new Date(transaction.date);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
  }, [allTransactions]);

  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    monthlyTransactions.forEach((tx) => {
      const amount = Math.abs(Number(tx.amount));
      if (tx.type === 'income') income += amount;
      else expense += amount;
    });
    return { income, expense, balance: income - expense };
  }, [monthlyTransactions]);

  const pieData = useMemo<CategorySlice[]>(() => {
    const byCategory = new Map<string, number>();
    monthlyTransactions
      .filter((transaction) => transaction.type === 'expense')
      .forEach((transaction) => {
        const amount = Math.abs(Number(transaction.amount));
        byCategory.set(
          transaction.category,
          (byCategory.get(transaction.category) || 0) + amount
        );
      });

    return Array.from(byCategory.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({
        category,
        amount,
        color: CATEGORY_COLORS[category] || CATEGORY_COLORS.Outros,
      }));
  }, [monthlyTransactions]);

  const available = Math.max(stats.balance, 0);
  const chartSize = Math.min(width - 48, 340);

  return (
    <View style={{ flex: 1, backgroundColor: '#03070D' }}>
      <DashboardBackground />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 22,
          paddingTop: 56,
          paddingBottom: 116,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0A84FF" />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View>
            <GlassSurface
              tintColor="rgba(10,132,255,0.10)"
              style={{
                paddingHorizontal: 18,
                paddingVertical: 11,
                borderRadius: 24,
                backgroundColor: 'rgba(11,34,59,0.52)',
                borderColor: 'rgba(62,140,222,0.32)',
              }}
            >
              <Text style={{ color: '#F5F5F7', fontSize: 27, fontWeight: '400', letterSpacing: -0.5 }}>
                {currentMonthLabel()}
              </Text>
            </GlassSurface>
            <Text
              style={{
                marginLeft: 14,
                marginTop: 14,
                color: '#89909D',
                fontSize: 15,
                fontWeight: '400',
              }}
            >
              {daysLeftInMonth()} dias restantes
            </Text>
          </View>

          <TouchableOpacity onPress={() => router.push('/profile')} activeOpacity={0.7}>
            <GlassSurface
              interactive
              tintColor="rgba(10,132,255,0.08)"
              style={{
                width: 54,
                height: 54,
                borderRadius: 27,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(11,34,59,0.46)',
                borderColor: 'rgba(62,140,222,0.28)',
              }}
            >
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  resizeMode="cover"
                  style={{ width: 46, height: 46, borderRadius: 23 }}
                />
              ) : (
                <Text style={{ color: '#F5F5F7', fontSize: 18, fontWeight: '400' }}>
                  {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              )}
            </GlassSurface>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 38, alignItems: 'center' }}>
          <CategoryPieChart
            data={pieData}
            total={stats.expense}
            centerValue={formatCurrencyWhole(available)}
            centerLabel="disponível para gastar"
            size={chartSize}
            thickness={15}
          />
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 30,
            marginBottom: 31,
          }}
        >
          <Metric label="Entradas" value={formatCurrencyWhole(stats.income)} color="#F5F5F7" />
          <Metric label="Gastos" value={formatCurrencyWhole(stats.expense)} color="#F5F5F7" />
          <Metric label="Disponível" value={formatCurrencyWhole(available)} color="#F5F5F7" />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: '#F5F5F7', fontSize: 20, fontWeight: '500', letterSpacing: -0.3 }}>
            Categorias
          </Text>
          <TouchableOpacity onPress={() => router.push('/transactions')} activeOpacity={0.65}>
            <Text style={{ color: '#4596FF', fontSize: 14, fontWeight: '400' }}>Ver todas</Text>
          </TouchableOpacity>
        </View>

        <GlassSurface
          tintColor="rgba(255,255,255,0.04)"
          style={{
            marginTop: 14,
            paddingHorizontal: 18,
            paddingVertical: 5,
            borderRadius: 28,
            backgroundColor: 'rgba(19,22,27,0.63)',
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        >
          {pieData.length === 0 ? (
            <Text
              style={{
                paddingVertical: 20,
                color: '#8E8E93',
                fontSize: 14,
                fontWeight: '400',
                textAlign: 'center',
              }}
            >
              Seus gastos aparecerão no gráfico por categoria.
            </Text>
          ) : (
            pieData.slice(0, 4).map((slice, index) => (
              <View
                key={slice.category}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 13,
                  borderBottomWidth: index < Math.min(pieData.length, 4) - 1 ? 0.5 : 0,
                  borderBottomColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <View
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 5,
                    marginRight: 12,
                    backgroundColor: slice.color,
                  }}
                />
                <Text style={{ flex: 1, color: '#D5D7DD', fontSize: 14, fontWeight: '400' }}>
                  {slice.category}
                </Text>
                <Text style={{ color: '#8E8E93', fontSize: 13, fontWeight: '400', marginRight: 13 }}>
                  {Math.round((slice.amount / stats.expense) * 100)}%
                </Text>
                <Text style={{ color: '#F5F5F7', fontSize: 14, fontWeight: '400' }}>
                  {formatCurrencyWhole(slice.amount)}
                </Text>
              </View>
            ))
          )}
        </GlassSurface>

        <View
          style={{
            marginTop: 30,
            marginBottom: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ color: '#F5F5F7', fontSize: 20, fontWeight: '500', letterSpacing: -0.3 }}>
            Atividade recente
          </Text>
          <TouchableOpacity onPress={() => router.push('/transactions')} activeOpacity={0.7}>
            <GlassSurface
              interactive
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                borderRadius: 18,
                paddingVertical: 8,
                paddingHorizontal: 12,
                backgroundColor: 'rgba(255,255,255,0.06)',
              }}
            >
              <Plus size={15} strokeWidth={1.5} color="#F5F5F7" />
              <Text style={{ color: '#F5F5F7', fontSize: 13, fontWeight: '400' }}>Adicionar</Text>
            </GlassSurface>
          </TouchableOpacity>
        </View>

        <GlassSurface
          tintColor="rgba(255,255,255,0.04)"
          style={{
            borderRadius: 28,
            overflow: 'hidden',
            backgroundColor: 'rgba(19,22,27,0.63)',
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#0A84FF" style={{ marginVertical: 32 }} />
          ) : transactions.length === 0 ? (
            <View style={{ padding: 26, alignItems: 'center' }}>
              <Text style={{ color: '#F5F5F7', fontSize: 15, fontWeight: '400' }}>
                Nenhuma transação ainda
              </Text>
              <Text
                style={{
                  color: '#8E8E93',
                  fontSize: 13,
                  fontWeight: '400',
                  marginTop: 7,
                  textAlign: 'center',
                }}
              >
                Adicione um lançamento para começar.
              </Text>
            </View>
          ) : (
            transactions.slice(0, 4).map((transaction, index) => (
              <View
                key={transaction.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 18,
                  paddingVertical: 15,
                  borderBottomWidth: index < Math.min(transactions.length, 4) - 1 ? 0.5 : 0,
                  borderBottomColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 13,
                    backgroundColor: `${CATEGORY_COLORS[transaction.category] || CATEGORY_COLORS.Outros}22`,
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor:
                        CATEGORY_COLORS[transaction.category] || CATEGORY_COLORS.Outros,
                    }}
                  />
                </View>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text
                    numberOfLines={1}
                    style={{ color: '#F5F5F7', fontSize: 15, fontWeight: '400' }}
                  >
                    {transaction.description || transaction.category}
                  </Text>
                  <Text style={{ color: '#8E8E93', fontSize: 12, fontWeight: '400', marginTop: 3 }}>
                    {transaction.bank ? `${transaction.bank} · ` : ''}
                    {new Date(transaction.date).toLocaleDateString('pt-BR', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                </View>
                <Text
                  style={{
                    color: transaction.type === 'income' ? '#30D158' : '#F5F5F7',
                    fontSize: 14,
                    fontWeight: '400',
                  }}
                >
                  {transaction.type === 'income' ? '+' : '-'}
                  {formatCurrency(Math.abs(Number(transaction.amount)))}
                </Text>
              </View>
            ))
          )}
        </GlassSurface>
      </ScrollView>
    </View>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ color: '#848A95', fontSize: 13, fontWeight: '400', marginBottom: 9 }}>
        {label}
      </Text>
      <Text style={{ color, fontSize: 18, fontWeight: '400', letterSpacing: -0.3 }}>{value}</Text>
    </View>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatCurrencyWhole(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

function currentMonthLabel() {
  const month = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date());
  return `${month.charAt(0).toUpperCase()}${month.slice(1)}`;
}

function daysLeftInMonth() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate();
}

function DashboardBackground() {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 490,
          backgroundColor: '#071A2B',
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 230,
          alignSelf: 'center',
          width: 390,
          height: 390,
          borderRadius: 195,
          backgroundColor: 'rgba(2,12,23,0.62)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 490,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#03070D',
        }}
      />
    </View>
  );
}
