import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import * as ImagePicker from 'expo-image-picker';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { decode } from 'base64-arraybuffer';

WebBrowser.maybeCompleteAuthSession();

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  shortcut_api_key: string | null;
  updated_at: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, username: string) => Promise<{ error: any }>;
  signInWithApple: () => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
  updateAvatar: () => Promise<{ error: any; success: boolean }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('Error fetching profile:', error.message);
        return null;
      } else {
        setProfile(data);
        return data as Profile;
      }
    } catch (err) {
      console.warn('Error in fetchProfile:', err);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    // Listen for OAuth deep-link callbacks (Google, etc.)
    const handleDeepLink = async (url: string) => {
      const parsed = Linking.parse(url);
      const params = parsed.queryParams ?? {};
      const access_token = params.access_token as string | undefined;
      const refresh_token = params.refresh_token as string | undefined;

      if (access_token) {
        await supabase.auth.setSession({
          access_token,
          refresh_token: refresh_token ?? '',
        });
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });
    const linkingSub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));

    return () => {
      subscription.unsubscribe();
      linkingSub.remove();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string, username: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          username: username,
        },
      },
    });

    if (!error && data.user) {
      setTimeout(async () => {
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            full_name: fullName,
            username: username,
            updated_at: new Date().toISOString(),
          });
          fetchProfile(data.user.id);
        }
      }, 1000);
    }

    setLoading(false);
    return { error };
  };

  // ==================== Apple Sign In ====================
  const signInWithApple = async () => {
    try {
      setLoading(true);

      const rawNonce = Array.from(Crypto.getRandomBytes(16))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      const idToken = credential.identityToken;
      if (!idToken) {
        setLoading(false);
        return { error: 'Não foi possível obter o token da Apple.' };
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: idToken,
        nonce: rawNonce,
      });

      if (!error && data.user) {
        const fullName = credential.fullName
          ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
          : null;

        if (fullName) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            full_name: fullName,
            updated_at: new Date().toISOString(),
          });
        }
      }

      setLoading(false);
      return { error };
    } catch (err: any) {
      setLoading(false);
      if (err.code === 'ERR_REQUEST_CANCELED') {
        return { error: null };
      }
      console.warn('Apple Sign In Error:', err);
      return { error: err.message || 'Erro ao entrar com Apple.' };
    }
  };

  // ==================== Google Sign In ====================
  const signInWithGoogle = async () => {
    if (isExpoGo) {
      Alert.alert(
        'Use o app instalado',
        'O login com Google só funciona no app instalado (build) — não dentro do Expo Go. Use a build do GitHub no seu iPhone.'
      );
      return { error: 'Login com Google indisponível dentro do Expo Go.' };
    }

    try {
      setLoading(true);

      const redirectUrl = Linking.createURL('auth/callback');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        setLoading(false);
        return { error: error.message };
      }

      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl, {
          showInRecents: true,
        });

        if (result.type === 'success' && result.url) {
          // Tokens come back in URL hash (#access_token=...) or query
          const fragment = result.url.includes('#')
            ? result.url.split('#')[1]
            : result.url.split('?')[1] ?? '';
          const params = new URLSearchParams(fragment);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token: refresh_token || '',
            });

            setLoading(false);
            return { error: sessionError };
          }
        }
      }

      setLoading(false);
      return { error: null };
    } catch (err: any) {
      setLoading(false);
      console.warn('Google Sign In Error:', err);
      return { error: err.message || 'Erro ao entrar com Google.' };
    }
  };

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setLoading(false);
    return { error };
  };

  // Upload profile photo
  const updateAvatar = async () => {
    if (!user) return { error: 'No authenticated user', success: false };

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permissão necessária', 'Permita acesso à galeria para alterar a foto.');
        return { error: 'Permission denied', success: false };
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        base64: true,
        quality: 0.75,
      });

      if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
        return { error: 'Cancelled', success: false };
      }

      const asset = pickerResult.assets[0];
      if (!asset.base64) {
        throw new Error('Não foi possível ler a imagem selecionada.');
      }

      const contentType = asset.mimeType ?? 'image/jpeg';
      const fileExt =
        asset.fileName?.split('.').pop()?.toLowerCase() ??
        contentType.split('/').pop()?.replace('jpeg', 'jpg') ??
        'jpg';
      const version = Date.now();
      const filePath = `${user.id}/profile-${version}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, decode(asset.base64), {
          cacheControl: '3600',
          contentType,
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const avatarUrl = `${publicUrl}?v=${version}`;

      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select('*')
        .single();

      if (updateError) throw updateError;

      setProfile(updatedProfile as Profile);
      return { error: null, success: true };
    } catch (err: any) {
      console.warn('Error updating avatar:', err);
      return { error: err.message || err, success: false };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signIn,
        signUp,
        signInWithApple,
        signInWithGoogle,
        signOut,
        refreshProfile,
        updateAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
