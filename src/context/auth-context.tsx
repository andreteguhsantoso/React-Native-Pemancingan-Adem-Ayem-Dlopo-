import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import type { Profile } from '@/lib/database.types';
import { isSupabaseConfigured, requireSupabase, supabase } from '@/lib/supabase';

type RegistrationData = {
  email: string;
  password: string;
  username: string;
  fullName: string;
  phone: string;
};

type ProfileUpdate = Pick<Profile, 'username' | 'full_name' | 'phone' | 'avatar_path'>;

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: RegistrationData) => Promise<{ confirmationRequired: boolean }>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  requestAccountDeletion: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: ProfileUpdate) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) throw new Error(error.message);
    setProfile(data as Profile);
  };

  const refreshProfile = async () => {
    if (!session?.user.id) {
      setProfile(null);
      return;
    }
    await loadProfile(session.user.id);
  };

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let mounted = true;
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!mounted) return;
      if (error) {
        setLoading(false);
        return;
      }
      setSession(data.session);
      if (data.session) {
        try {
          await loadProfile(data.session.user.id);
        } catch {
          setProfile(null);
        }
      }
      if (mounted) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      if (!nextSession) {
        setProfile(null);
      } else {
        setTimeout(() => {
          loadProfile(nextSession.user.id).catch(() => setProfile(null));
        }, 0);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await requireSupabase().auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(error.message);
  };

  const signUp = async (data: RegistrationData) => {
    const { data: result, error } = await requireSupabase().auth.signUp({
      email: data.email.trim(),
      password: data.password,
      options: {
        data: {
          username: data.username.trim(),
          full_name: data.fullName.trim(),
          phone: data.phone.replace(/\D/g, ''),
        },
      },
    });
    if (error) throw new Error(error.message);
    return { confirmationRequired: !result.session };
  };

  const signOut = async () => {
    const { error } = await requireSupabase().auth.signOut();
    if (error) throw new Error(error.message);
  };

  const requestPasswordReset = async (email: string) => {
    const { error } = await requireSupabase().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: Linking.createURL('/reset-password'),
    });
    if (error) throw new Error(error.message);
  };

  const updatePassword = async (password: string) => {
    const { error } = await requireSupabase().auth.updateUser({ password });
    if (error) throw new Error(error.message);
  };

  const requestAccountDeletion = async () => {
    if (!session) throw new Error('Silakan masuk terlebih dahulu.');
    const client = requireSupabase();
    const { data: existing, error: lookupError } = await client
      .from('account_deletion_requests')
      .select('id,status')
      .eq('user_id', session.user.id)
      .in('status', ['pending', 'processing'])
      .maybeSingle();
    if (lookupError) throw new Error(lookupError.message);
    if (existing) throw new Error('Permintaan penghapusan akun Anda sudah diterima dan sedang diproses.');
    const { error } = await client.from('account_deletion_requests').insert({ user_id: session.user.id });
    if (error) throw new Error(error.message);
  };

  const updateProfile = async (data: ProfileUpdate) => {
    if (!session) throw new Error('Silakan masuk terlebih dahulu.');
    const { error } = await requireSupabase().from('profiles').update(data).eq('id', session.user.id);
    if (error) throw new Error(error.message);
    await loadProfile(session.user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        configured: isSupabaseConfigured,
        loading,
        session,
        profile,
        signIn,
        signUp,
        requestPasswordReset,
        updatePassword,
        requestAccountDeletion,
        signOut,
        refreshProfile,
        updateProfile,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth harus digunakan di dalam AuthProvider');
  return context;
}
