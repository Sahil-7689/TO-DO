import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

type Extra = { supabaseUrl?: string; supabaseAnonKey?: string } | undefined;
const extra = (Constants.expoConfig?.extra || (Constants as any).manifest?.extra) as Extra;

function isValidUrl(url?: string) {
  if (!url) return false;
  if (url.includes('${')) return false;
  return /^https?:\/\//.test(url);
}

let client: SupabaseClient | null = null;

export function hasSupabaseConfig(): boolean {
  const key = extra?.supabaseAnonKey;
  const url = extra?.supabaseUrl;
  // anon keys are JWTs and typically contain two dots
  const looksLikeJwt = typeof key === 'string' && key.split('.').length >= 3;
  const ok = isValidUrl(url) && !!key && !String(key).includes('${') && looksLikeJwt;
  if (!ok && __DEV__) {
    // Minimal masked diagnostics in dev
    // eslint-disable-next-line no-console
    console.warn('[supabase] Invalid config', {
      url,
      keyPrefix: key ? String(key).slice(0, 6) + '…' : 'empty',
    });
  }
  return ok;
}

export function getSupabase(): SupabaseClient {
  if (!hasSupabaseConfig()) {
    throw new Error('Supabase not configured: set supabaseUrl and supabaseAnonKey in app config.');
  }
  if (!client) {
    client = createClient(extra!.supabaseUrl as string, extra!.supabaseAnonKey as string);
  }
  return client;
}


