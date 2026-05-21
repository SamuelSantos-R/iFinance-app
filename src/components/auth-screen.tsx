import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useAuth } from '@/context/auth-context';
import {
  Lock,
  Mail,
  User,
  ShieldAlert,
  Eye,
  EyeOff,
  ChevronLeft,
  Wallet,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import * as AppleAuthentication from 'expo-apple-authentication';

type Step = 'landing' | 'form';

const INPUT_HEIGHT = 56;

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
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync()
        .then(setAppleAvailable)
        .catch(() => setAppleAvailable(false));
    }
  }, []);

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
          Alert.alert('Pronto!', 'Conta criada com sucesso. Você já pode entrar.');
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
      Alert.alert('Erro ao entrar com Google', typeof error === 'string' ? error : error?.message ?? '');
    }
  };

  const handleAppleSignIn = async () => {
    const { error } = await signInWithApple();
    if (error) {
      Alert.alert('Erro ao entrar com Apple', typeof error === 'string' ? error : error?.message ?? '');
    }
  };

  // ==================== LANDING SCREEN ====================
  if (step === 'landing') {
    return (
      <View className="flex-1 bg-black">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          className="px-8"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo & Headline */}
          <View className="items-center mb-12">
            <View
              className="bg-blue-600 items-center justify-center mb-8"
              style={{
                width: 80,
                height: 80,
                borderRadius: 24,
                shadowColor: '#007AFF',
                shadowOpacity: 0.4,
                shadowRadius: 24,
                shadowOffset: { width: 0, height: 8 },
              }}
            >
              <Wallet size={38} color="white" strokeWidth={2.2} />
            </View>
            <Text className="text-[28px] font-bold text-white text-center tracking-tight">
              Suas finanças, no controle.
            </Text>
            <Text className="text-zinc-400 text-[15px] mt-3 text-center leading-5">
              Acompanhe gastos, receitas e tenha clareza{'\n'}sobre seu dinheiro em tempo real.
            </Text>
          </View>

          {/* Buttons */}
          <View className="gap-3 mb-8">
            {Platform.OS === 'ios' && appleAvailable && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                cornerRadius={16}
                style={{ width: '100%', height: 52 }}
                onPress={handleAppleSignIn}
              />
            )}

            <TouchableOpacity
              onPress={handleGoogleSignIn}
              activeOpacity={0.7}
              className="w-full bg-white flex-row items-center justify-center"
              style={{ height: 52, borderRadius: 16, gap: 10 }}
            >
              <Image
                source="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                style={{ width: 18, height: 18 }}
                contentFit="contain"
              />
              <Text className="text-black font-semibold text-[15px]">
                Continuar com Google
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => goToForm(true)}
              activeOpacity={0.7}
              className="w-full bg-blue-600 flex-row items-center justify-center"
              style={{
                height: 52,
                borderRadius: 16,
                gap: 10,
                shadowColor: '#007AFF',
                shadowOpacity: 0.3,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
              }}
            >
              <Mail size={18} color="white" strokeWidth={2.2} />
              <Text className="text-white font-semibold text-[15px]">
                Continuar com E-mail
              </Text>
            </TouchableOpacity>
          </View>

          {/* Entrar link */}
          <TouchableOpacity onPress={() => goToForm(false)} className="items-center py-2">
            <Text className="text-zinc-400 text-[14px]">
              Já tem uma conta?{' '}
              <Text className="text-blue-500 font-semibold">Entrar</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Terms - fixed at bottom */}
        <View className="px-8 pb-8 pt-4">
          <Text className="text-zinc-600 text-[11px] text-center leading-4">
            Ao continuar você concorda com os{' '}
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
      <View className="px-5 pt-14">
        <TouchableOpacity
          onPress={goBack}
          activeOpacity={0.6}
          className="bg-zinc-900 border border-zinc-800 items-center justify-center"
          style={{ width: 40, height: 40, borderRadius: 20 }}
        >
          <ChevronLeft size={22} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingBottom: 40 }}
        className="px-8"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center mb-10">
          <Text className="text-[28px] font-bold text-white text-center tracking-tight">
            {isSignUp ? 'Crie sua conta' : 'Bem-vindo de volta'}
          </Text>
          <Text className="text-zinc-400 text-[15px] mt-2 text-center">
            {isSignUp ? 'Leva menos de um minuto.' : 'Entre com suas credenciais.'}
          </Text>
        </View>

        {error && (
          <View className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex-row items-center mb-5 gap-3">
            <ShieldAlert size={18} color="#FF3B30" />
            <Text className="text-red-400 text-[13px] flex-1">{error}</Text>
          </View>
        )}

        {isSignUp && (
          <View className="gap-3 mb-3">
            <InputRow
              icon={<User size={18} color="#8E8E93" strokeWidth={2} />}
              placeholder="Nome completo"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
            <InputRow
              icon={<User size={18} color="#8E8E93" strokeWidth={2} />}
              placeholder="Nome de usuário"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>
        )}

        <View className="gap-3 mb-6">
          <InputRow
            icon={<Mail size={18} color="#8E8E93" strokeWidth={2} />}
            placeholder="Seu e-mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <InputRow
            icon={<Lock size={18} color="#8E8E93" strokeWidth={2} />}
            placeholder="Sua senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            trailing={
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={8}
                activeOpacity={0.6}
              >
                {showPassword ? (
                  <EyeOff size={18} color="#8E8E93" />
                ) : (
                  <Eye size={18} color="#8E8E93" />
                )}
              </TouchableOpacity>
            }
          />
        </View>

        <TouchableOpacity
          onPress={handleAuth}
          disabled={loading}
          activeOpacity={0.85}
          className="w-full bg-blue-600 items-center justify-center mb-4"
          style={{
            height: INPUT_HEIGHT,
            borderRadius: 16,
            shadowColor: '#007AFF',
            shadowOpacity: 0.3,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-[15px]">
              {isSignUp ? 'Criar conta' : 'Entrar'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setIsSignUp(!isSignUp);
            setError(null);
          }}
          activeOpacity={0.6}
          className="items-center py-2"
        >
          <Text className="text-zinc-400 text-[14px]">
            {isSignUp ? 'Já tem uma conta? ' : 'Novo por aqui? '}
            <Text className="text-blue-500 font-semibold">
              {isSignUp ? 'Entrar' : 'Criar conta'}
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ==================== INPUT COMPONENT ====================
interface InputRowProps extends React.ComponentProps<typeof TextInput> {
  icon: React.ReactNode;
  trailing?: React.ReactNode;
}

function InputRow({ icon, trailing, style, ...textInputProps }: InputRowProps) {
  return (
    <View
      className="flex-row items-center bg-zinc-900 border border-zinc-800"
      style={{
        height: INPUT_HEIGHT,
        borderRadius: 16,
        paddingHorizontal: 16,
        gap: 12,
      }}
    >
      {icon}
      <TextInput
        placeholderTextColor="#636366"
        style={[
          {
            flex: 1,
            color: 'white',
            fontSize: 15,
            height: '100%',
            paddingVertical: 0,
            includeFontPadding: false,
          },
          style,
        ]}
        {...textInputProps}
      />
      {trailing}
    </View>
  );
}
