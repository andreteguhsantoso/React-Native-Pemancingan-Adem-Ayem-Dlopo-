import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);
const isServerRender = Platform.OS === 'web' && typeof window === 'undefined';

export function getSupabaseConfigStatus() {
  let projectHost: string | null = null;
  if (supabaseUrl) {
    try { projectHost = new URL(supabaseUrl).host; } catch { projectHost = null; }
  }
  return {
    hasUrl: Boolean(supabaseUrl),
    hasPublishableKey: Boolean(supabasePublishableKey),
    projectHost,
  };
}

export const supabase = createClient(
  supabaseUrl || 'https://not-configured.supabase.co',
  supabasePublishableKey || 'sb_publishable_not_configured',
  {
    auth: {
      storage: isServerRender ? undefined : AsyncStorage,
      autoRefreshToken: !isServerRender,
      persistSession: !isServerRender,
      detectSessionInUrl: false,
    },
  },
);

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

export function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Backend belum dikonfigurasi. Isi EXPO_PUBLIC_SUPABASE_URL dan EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    );
  }
  return supabase;
}
