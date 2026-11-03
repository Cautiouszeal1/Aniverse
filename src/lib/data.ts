import "server-only";
import { createClient } from "@/lib/supabase/server";
import { signedUrlsFor } from "@/server/images/storage";

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

// ---------------------------------------------------------------------
// Characters
// ---------------------------------------------------------------------

export type CharacterVersion = {
  id: string;
  character_id: string;
  version: number;
  prompt: string;
  style: string;
  mood: string;
  aspect_ratio: string;
  provider: string;
  model: string;
  is_demo: boolean;
  seed: string;
  image_path: string | null;
  created_at: string;
  /** Short-lived signed URL when the image is in private storage. */
  image_url?: string | null;
};

export type CharacterWithLatest = {
  id: string;
  name: string;
  project_id: string;
  updated_at: string;
  versionCount: number;
  latest: CharacterVersion | null;
};

const VERSION_COLUMNS =
  "id, character_id, version, prompt, style, mood, aspect_ratio, provider, model, is_demo, seed, image_path, created_at";

export async function getProject(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, title, description, status, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Could not load project");
  return (data as Project | null) ?? null;
}

export async function listCharacters(projectId?: string): Promise<CharacterWithLatest[]> {
  const supabase = await createClient();
  let q = supabase
    .from("characters")
    .select("id, name, project_id, updated_at")
    .order("updated_at", { ascending: false });
  if (projectId) q = q.eq("project_id", projectId);
  const { data: chars, error } = await q;
  if (error) throw new Error("Could not load characters");
  if (!chars?.length) return [];

  const { data: versions, error: vErr } = await supabase
    .from("character_versions")
    .select(VERSION_COLUMNS)
    .in("character_id", chars.map((c) => c.id))
    .order("version", { ascending: false });
  if (vErr) throw new Error("Could not load character versions");

  const all = (versions ?? []) as CharacterVersion[];
  const latestByChar = new Map<string, CharacterVersion>();
  for (const v of all) if (!latestByChar.has(v.character_id)) latestByChar.set(v.character_id, v);
  const urls = await signedUrlsFor(supabase, [...latestByChar.values()].map((v) => v.image_path ?? ""));

  return chars.map((c) => {
    const vs = all.filter((v) => v.character_id === c.id);
    const latest = latestByChar.get(c.id) ?? null;
    return {
      ...c,
      versionCount: vs.length,
      latest: latest ? { ...latest, image_url: urls.get(latest.image_path ?? "") ?? null } : null,
    };
  });
}

export async function getCharacter(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data: character, error } = await supabase
    .from("characters")
    .select("id, name, project_id, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Could not load character");
  if (!character) return null;
  const { data: versions, error: vErr } = await supabase
    .from("character_versions")
    .select(VERSION_COLUMNS)
    .eq("character_id", id)
    .order("version", { ascending: false });
  if (vErr) throw new Error("Could not load versions");
  const vs = (versions ?? []) as CharacterVersion[];
  const urls = await signedUrlsFor(supabase, vs.map((v) => v.image_path ?? ""));
  return {
    ...character,
    versions: vs.map((v) => ({ ...v, image_url: urls.get(v.image_path ?? "") ?? null })),
  };
}
