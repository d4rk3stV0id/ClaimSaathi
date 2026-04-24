import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const isSupabaseEnabled = Boolean(
  supabaseUrl &&
    supabaseUrl !== 'YOUR_SUPABASE_PROJECT_URL' &&
    supabaseAnonKey &&
    supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY',
);

// Warn explicitly if no keys are provided, allowing graceful degradation
if (!isSupabaseEnabled) {
  console.warn('Supabase URL or Anon Key is missing. Check your .env file.');
}

const projectRef =
  supabaseUrl
    ?.replace(/^https?:\/\//, '')
    ?.split('.')[0]
    ?.trim() || 'placeholder';
const storageKey = `sb-${projectRef}-auth-token`;

declare global {
  interface Window {
    __claimsaathiSupabaseClient?: any;
  }
}

export function clearSupabaseLocalSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(storageKey);
  sessionStorage.removeItem(storageKey);
}

const createSupabase = () =>
  createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder-key', {
    auth: {
      storageKey,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

export const supabase =
  typeof window !== 'undefined'
    ? (window.__claimsaathiSupabaseClient ??= createSupabase())
    : createSupabase();
