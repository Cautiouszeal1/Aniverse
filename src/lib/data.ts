import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Project = {
  id: string;
  title: string;
  description: string | null;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
};

export type LedgerEntry = {
  id: number;
  delta: number;
  reason: string;
  note: string | null;
  created_at: string;
};

export type CreditPack = {
  id: string;
  name: string;
  price_usd_cents: number;
  credits: number;
};

// All queries run as the signed-in user; row-level security restricts rows.

export async function listProjects(opts: { status?: "active" | "archived"; limit?: number } = {}) {
  const supabase = await createClient();
  let q = supabase
    .from("projects")
    .select("id, title, description, status, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (opts.status) q = q.eq("status", opts.status);
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw new Error("Could not load projects");
  return (data ?? []) as Project[];
}

export async function countProjects() {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");
  if (error) throw new Error("Could not count projects");
  return count ?? 0;
}

export async function listLedger(limit = 50) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("credit_ledger")
    .select("id, delta, reason, note, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Could not load credit history");
  return (data ?? []) as LedgerEntry[];
}

export async function listPacks() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("credit_packs")
    .select("id, name, price_usd_cents, credits")
    .order("sort_order");
  if (error) throw new Error("Could not load credit packs");
  return (data ?? []) as CreditPack[];
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function usd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}
