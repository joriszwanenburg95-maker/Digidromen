import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../types/database";
import { portalEnv } from "./env";

let client: SupabaseClient<Database> | null = null;

if (portalEnv.isSupabaseConfigured) {
  client = createClient<Database>(portalEnv.supabaseUrl, portalEnv.supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export const supabase = client;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error(
      "Supabase client is not configured. Add VITE_SUPABASE_URL and either VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY to portal/.env.local.",
    );
  }

  return supabase;
}
