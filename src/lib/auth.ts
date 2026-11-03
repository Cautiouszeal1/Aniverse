import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  displayName: string | null;
  creatorType: string | null;
  onboarded: boolean;
};

/**
 * Data Access Layer entry point: verifies the session with Supabase (not just
 * the cookie) and returns a narrow user object. Redirects to /login if absent.
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, creator_type, onboarded_at")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? "",
    displayName: profile?.display_name ?? null,
    creatorType: profile?.creator_type ?? null,
    onboarded: Boolean(profile?.onboarded_at),
  };
}

export async function getCreditBalance(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_credit_balance");
  if (error) throw new Error("Could not load credit balance");
  return typeof data === "number" ? data : 0;
}

/** Only allow same-site relative redirects after login. */
export function safeNext(next: unknown, fallback = "/dashboard"): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\"))
    return fallback;
  return next;
}
