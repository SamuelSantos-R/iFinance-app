import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import * as ImagePicker from 'expo-image-picker';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

WebBrowser.maybeCompleteAuthSession();

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

  // Fetch user profile from Supabase
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error('Error in fetchProfile:', err);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string, username: string) => {
    setLoading(true);
    // Sign up the user
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

    // If successful and profile wasn't auto-created or we want to ensure it, we can wait a bit
    if (!error && data.user) {
      // Small delay to let trigger finish
      setTimeout(async () => {
        if (data.user) {
          // If trigger fails or is slow, we can upsert
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

      // Generate a random nonce for security
      const rawNonce = Crypto.getRandomBytes(16)
        .reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );

      // Request Apple Sign In credential
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

      // Sign in with Supabase using the Apple ID token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: idToken,
        nonce: rawNonce,
      });

      if (!error && data.user) {
        // Update profile with Apple name if available
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
        return { error: null }; // User cancelled, not an error
      }
      console.error('Apple Sign In Error:', err);
      return { error: err.message || 'Erro ao entrar com Apple.' };
    }
  };

  // ==================== Google Sign In ====================
  const signInWithGoogle = async () => {
    try {
      setLoading(true);

      const redirectUrl = Linking.createURL('auth/callback');
      console.log('--- SUPABASE OAUTH REDIRECT URL ---');
      console.log(redirectUrl);
      console.log('------------------------------------');

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
        // Open the OAuth URL in the browser
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        if (result.type === 'success' && result.url) {
          // Parse access_token and refresh_token from the redirected URL hash or query params
          const urlObj = new URL(result.url.replace('#', '?'));
          const access_token = urlObj.searchParams.get('access_token');
          const refresh_token = urlObj.searchParams.get('refresh_token');

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
      return { error: null }; // User closed browser or no session found
    } catch (err: any) {
      setLoading(false);
      console.error('Google Sign In Error:', err);
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
      // Request media library permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        alert('É necessária permissão para acessar a galeria!');
        return { error: 'Permission denied', success: false };
      }

      // Pick the image
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
        return { error: 'Cancelled', success: false };
      }

      const imageUri = pickerResult.assets[0].uri;
      const fileExt = imageUri.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Convert image to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Upload to Supabase Storage bucket 'avatars'
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile avatar_url
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      return { error: null, success: true };
    } catch (err: any) {
      console.error('Error updating avatar:', err);
      
      // Fallback: use dicebear avatar
      try {
        const mockUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.email}`;
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            avatar_url: mockUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
          
        if (!updateError) {
          await refreshProfile();
          return { error: null, success: true };
        }
      } catch (innerErr) {}
      
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
