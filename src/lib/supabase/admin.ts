import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./config";

/**
 * Service-role client. Bypasses row-level security, so it is used ONLY by
 * trusted server code (payment watcher). Never import from client code.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !key) throw new Error("Payments are not configured on the server");
  return createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isAdminConfigured() {
  return Boolean(supabaseUrl && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}
