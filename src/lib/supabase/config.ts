/**
 * Supabase public configuration. The URL and publishable (anon) key are safe
 * to expose to the browser; access control is enforced by row-level security.
 * Never put the service-role key here.
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
export const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/** Bump when the Terms/Privacy text changes; stored on each profile at signup. */
export const TERMS_VERSION = "2026-11-03";
