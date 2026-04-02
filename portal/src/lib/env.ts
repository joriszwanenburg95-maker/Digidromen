function normalizeEnvValue(value?: string): string {
  return value?.trim() ?? "";
}

function normalizeSupabaseKey(value?: string): string {
  return normalizeEnvValue(value).replace(/\s+/g, "");
}

const supabaseUrl = normalizeEnvValue(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = normalizeSupabaseKey(import.meta.env.VITE_SUPABASE_ANON_KEY);
const supabasePublishableKey = normalizeSupabaseKey(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
const supabaseKey = supabasePublishableKey || supabaseAnonKey;

export const portalEnv = {
  supabaseUrl,
  supabaseAnonKey,
  supabasePublishableKey,
  supabaseKey,
  hasSupabaseUrl: supabaseUrl.length > 0,
  hasSupabaseAnonKey: supabaseAnonKey.length > 0,
  hasSupabasePublishableKey: supabasePublishableKey.length > 0,
  get hasSupabaseKey() {
    return this.hasSupabasePublishableKey || this.hasSupabaseAnonKey;
  },
  get isSupabaseConfigured() {
    return this.hasSupabaseUrl && this.hasSupabaseKey;
  },
};

export function getMissingSupabaseEnv(): string[] {
  const missing: string[] = [];

  if (!portalEnv.hasSupabaseUrl) {
    missing.push("VITE_SUPABASE_URL");
  }

  if (!portalEnv.hasSupabaseKey) {
    missing.push("VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY");
  }

  return missing;
}
