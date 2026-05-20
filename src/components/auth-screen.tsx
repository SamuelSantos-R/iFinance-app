import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useAuth } from '@/context/auth-context';
import { Lock, Mail, User, ShieldAlert, Sparkles, Eye, EyeOff, ChevronLeft, BarChart3 } from 'lucide-react-native';
import { Image } from 'expo-image';

type Step = 'landing' | 'form';

export function AuthScreen() {
  const { signIn, signUp, signInWithApple, signInWithGoogle } = useAuth();
  const [step, setStep] = useState<Step>('landing');
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    if (isSignUp && (!fullName || !username)) {
      setError('Por favor, preencha o seu nome e nome de usuário.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { error: signUpError } = await signUp(email, password, fullName, username);
        if (signUpError) {
          setError(signUpError.message || 'Erro ao cadastrar. Tente novamente.');
        } else {
          alert('Conta criada com sucesso! Você já pode fazer login.');
          setIsSignUp(false);
        }
      } else {
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          setError(signInError.message || 'Credenciais inválidas. Verifique seu e-mail e senha.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const goToForm = (signUp: boolean) => {
    setIsSignUp(signUp);
    setError(null);
    setStep('form');
  };

  const goBack = () => {
    setStep('landing');
    setError(null);
  };


  const handleGoogleSignIn = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      Alert.alert('Erro', error);
    }
  };

  // ==================== LANDING SCREEN ====================
  if (step === 'landing') {
    return (
      <View className="flex-1 bg-black">
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} className="px-8">
          {/* Logo & Headline */}
          <View className="items-center mb-12">
            <View className="w-20 h-20 bg-blue-600 rounded-3xl items-center justify-center mb-8 shadow-lg shadow-blue-500/30">
              <BarChart3 size={40} color="white" />
            </View>
            <Text className="text-2xl font-bold text-white text-center tracking-tight">
              É hora de iniciar sua jornada!
            </Text>
            <Text className="text-zinc-400 text-sm mt-3 text-center leading-5">
              Crie sua conta e comece a transformar{'\n'}suas finanças.
            </Text>
          </View>

          {/* Buttons */}
          <View className="gap-4 mb-8">
            <TouchableOpacity
              onPress={handleGoogleSignIn}
              className="w-full bg-transparent border border-zinc-700 rounded-2xl py-4 flex-row items-center justify-center active:bg-zinc-900 gap-3"
            >
              <Image 
                source="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" 
                style={{ width: 20, height: 20 }}
                contentFit="contain"
              />
              <Text className="text-white font-bold text-base">
                Continuar com Google
              </Text>
            </TouchableOpacity>

            {/* Continuar com E-mail (Primary - filled) */}
            <TouchableOpacity
              onPress={() => goToForm(true)}
              className="w-full bg-blue-600 rounded-2xl py-4 flex-row items-center justify-center active:bg-blue-700 shadow-lg shadow-blue-500/20"
            >
              <Mail size={20} color="white" />
              <Text className="text-white font-bold text-base ml-3">
                Continuar com E-mail
              </Text>
            </TouchableOpacity>
          </View>

          {/* Entrar link */}
          <TouchableOpacity
            onPress={() => goToForm(false)}
            className="items-center py-2"
          >
            <Text className="text-blue-500 font-semibold text-base">
              Entrar
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Terms - fixed at bottom */}
        <View className="px-8 pb-5 pt-4">
          <Text className="text-zinc-600 text-xs text-center leading-4">
            Ao continuar você estará concordando com os{' '}
            <Text className="text-zinc-400 underline">Termos de Uso</Text> e{' '}
            <Text className="text-zinc-400 underline">Privacidade</Text>.
          </Text>
        </View>
      </View>
    );
  }

  // ==================== FORM SCREEN ====================
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-black"
    >
      {/* Back button */}
      <View className="px-4 pt-14">
        <TouchableOpacity
          onPress={goBack}
          className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 items-center justify-center"
        >
          <ChevronLeft size={22} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} className="px-8">
        {/* Header */}
        <View className="items-center mb-8">
          <View className="w-16 h-16 bg-blue-600 rounded-2xl items-center justify-center mb-5 shadow-lg shadow-blue-500/30">
            <Sparkles size={32} color="white" />
          </View>
          <Text className="text-2xl font-bold text-white text-center tracking-tight">
            {isSignUp ? 'Criar nova conta' : 'Bem-vindo de volta!'}
          </Text>
          <Text className="text-zinc-400 text-sm mt-2 text-center">
            {isSignUp ? 'Preencha os dados para começar' : 'Entre com suas credenciais'}
          </Text>
        </View>

        {/* Error */}
        {error && (
          <View className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex-row items-center mb-6 gap-3">
            <ShieldAlert size={20} color="#FF3B30" />
            <Text className="text-red-400 text-sm flex-1">{error}</Text>
          </View>
        )}

        {/* Sign-up only fields */}
        {isSignUp && (
          <View className="gap-4 mb-4">
            <View className="flex-row items-center bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4 gap-3">
              <User size={20} color="#636366" />
              <TextInput
                placeholder="Nome completo"
                placeholderTextColor="#636366"
                className="text-white flex-1 text-base"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>

            <View className="flex-row items-center bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4 gap-3">
              <User size={20} color="#636366" />
              <TextInput
                placeholder="Nome de usuário"
                placeholderTextColor="#636366"
                className="text-white flex-1 text-base"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>
          </View>
        )}

        {/* Email & Password */}
        <View className="gap-4 mb-6">
          <View className="flex-row items-center bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4 gap-3">
            <Mail size={20} color="#636366" />
            <TextInput
              placeholder="Seu e-mail"
              placeholderTextColor="#636366"
              className="text-white flex-1 text-base"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View className="flex-row items-center bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4 gap-3">
            <Lock size={20} color="#636366" />
            <TextInput
              placeholder="Sua senha"
              placeholderTextColor="#636366"
              className="text-white flex-1 text-base"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-1">
              {showPassword ? (
                <EyeOff size={20} color="#636366" />
              ) : (
                <Eye size={20} color="#636366" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleAuth}
          disabled={loading}
          className="w-full bg-blue-600 rounded-2xl py-4 items-center mb-5 active:bg-blue-700 shadow-lg shadow-blue-500/20"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-base">
              {isSignUp ? 'Cadastrar' : 'Entrar'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Toggle Sign In / Sign Up */}
        <TouchableOpacity
          onPress={() => {
            setIsSignUp(!isSignUp);
            setError(null);
          }}
          className="items-center py-2"
        >
          <Text className="text-blue-500 font-semibold text-sm">
            {isSignUp ? 'Já tem uma conta? Entrar' : 'Novo por aqui? Criar conta'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
