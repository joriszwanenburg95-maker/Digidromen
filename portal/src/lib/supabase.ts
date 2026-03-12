import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { portalEnv } from "./env";

let client: SupabaseClient | null = null;

if (portalEnv.isSupabaseConfigured) {
  client = createClient(portalEnv.supabaseUrl, portalEnv.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export const supabase = client;

export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      "Supabase client is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to portal/.env.local.",
    );
  }

  return supabase;
}
