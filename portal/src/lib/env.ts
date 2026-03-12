const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";

export const portalEnv = {
  supabaseUrl,
  supabaseAnonKey,
  hasSupabaseUrl: supabaseUrl.length > 0,
  hasSupabaseAnonKey: supabaseAnonKey.length > 0,
  get isSupabaseConfigured() {
    return this.hasSupabaseUrl && this.hasSupabaseAnonKey;
  },
};

export function getMissingSupabaseEnv(): string[] {
  const missing: string[] = [];

  if (!portalEnv.hasSupabaseUrl) {
    missing.push("VITE_SUPABASE_URL");
  }

  if (!portalEnv.hasSupabaseAnonKey) {
    missing.push("VITE_SUPABASE_ANON_KEY");
  }

  return missing;
}
