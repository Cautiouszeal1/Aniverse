import "server-only";
import { createClient } from "@/lib/supabase/server";
import { signedUrlsFor } from "@/server/images/storage";
import { signedVideoUrls } from "@/server/video/storage";

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

// ---------------------------------------------------------------------
// Storyboards
// ---------------------------------------------------------------------

export type Scene = {
  id: string;
  position: number;
  title: string;
  description: string;
  dialogue: string;
  shot_type: string;
  camera_notes: string;
  duration_seconds: number;
  character_ids: string[];
  updated_at: string;
};

export type StoryboardRevision = {
  id: string;
  label: string;
  scene_count: number;
  created_at: string;
};

export async function getStoryboard(projectId: string) {
  const supabase = await createClient();
  const { data: board, error } = await supabase
    .from("storyboards")
    .select("id, title, updated_at")
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw new Error("Could not load storyboard");
  if (!board) return { board: null, scenes: [] as Scene[], revisions: [] as StoryboardRevision[] };

  const [{ data: scenes, error: sErr }, { data: revisions, error: rErr }] = await Promise.all([
    supabase
      .from("storyboard_scenes")
      .select("id, position, title, description, dialogue, shot_type, camera_notes, duration_seconds, character_ids, updated_at")
      .eq("storyboard_id", board.id)
      .order("position", { ascending: true }),
    supabase
      .from("storyboard_revisions")
      .select("id, label, scene_count, created_at")
      .eq("storyboard_id", board.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  if (sErr || rErr) throw new Error("Could not load storyboard");
  return {
    board,
    scenes: ((scenes ?? []) as Scene[]).map((s) => ({ ...s, duration_seconds: Number(s.duration_seconds) })),
    revisions: (revisions ?? []) as StoryboardRevision[],
  };
}

export async function storyboardSummaries() {
  const supabase = await createClient();
  const { data: boards, error } = await supabase.from("storyboards").select("id, project_id, updated_at");
  if (error) throw new Error("Could not load storyboards");
  if (!boards?.length) return new Map<string, { scenes: number; seconds: number }>();
  const { data: scenes } = await supabase
    .from("storyboard_scenes")
    .select("storyboard_id, duration_seconds")
    .in("storyboard_id", boards.map((b) => b.id));
  const map = new Map<string, { scenes: number; seconds: number }>();
  for (const b of boards) {
    const own = (scenes ?? []).filter((s) => s.storyboard_id === b.id);
    map.set(b.project_id, {
      scenes: own.length,
      seconds: own.reduce((t, s) => t + Number(s.duration_seconds), 0),
    });
  }
  return map;
}

// ---------------------------------------------------------------------
// Animations
// ---------------------------------------------------------------------

export type Price = {
  id: "motion-standard" | "motion-pro";
  label: string;
  description: string;
  credits_per_clip: number;
  max_seconds: number;
  enabled: boolean;
};

export type Clip = {
  id: string;
  project_id: string;
  scene_id: string | null;
  version: number;
  quality: string;
  prompt: string;
  duration_seconds: number;
  aspect_ratio: "16:9" | "9:16";
  is_demo: boolean;
  video_path: string | null;
  bytes: number | null;
  created_at: string;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  charged: number;
  refunded: number;
  video_url?: string | null;
  download_url?: string | null;
};

export async function listPrices() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_prices")
    .select("id, label, description, credits_per_clip, max_seconds, enabled")
    .order("sort_order");
  if (error) throw new Error("Could not load prices");
  return (data ?? []) as Price[];
}

export async function videoServicePaused() {
  const supabase = await createClient();
  const { data } = await supabase.from("ai_service_status").select("paused").eq("service", "video").maybeSingle();
  return Boolean(data?.paused);
}

export async function listClips(opts: { projectId?: string; limit?: number } = {}): Promise<Clip[]> {
  const supabase = await createClient();
  let q = supabase
    .from("animation_clips")
    .select(
      "id, project_id, scene_id, version, quality, prompt, duration_seconds, aspect_ratio, is_demo, video_path, bytes, created_at, generation_jobs!inner(status, charged_credits, refunded_credits)",
    )
    .order("created_at", { ascending: false });
  if (opts.projectId) q = q.eq("project_id", opts.projectId);
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw new Error("Could not load animations");
  const rows = (data ?? []).map((r) => {
    const job = r.generation_jobs as unknown as { status: Clip["status"]; charged_credits: number; refunded_credits: number };
    const { generation_jobs: _omit, ...rest } = r as typeof r & { generation_jobs: unknown };
    void _omit;
    return { ...(rest as Omit<Clip, "status" | "charged" | "refunded">), status: job.status, charged: job.charged_credits, refunded: job.refunded_credits };
  });
  const paths = rows.map((r) => r.video_path ?? "");
  const [view, download] = await Promise.all([signedVideoUrls(supabase, paths), signedVideoUrls(supabase, paths, true)]);
  return rows.map((r) => ({
    ...r,
    video_url: r.video_path ? view.get(r.video_path) ?? null : null,
    download_url: r.video_path ? download.get(r.video_path) ?? null : null,
  }));
}

export async function clipCounts() {
  const supabase = await createClient();
  const { data } = await supabase.from("animation_clips").select("project_id");
  const map = new Map<string, number>();
  for (const r of data ?? []) map.set(r.project_id, (map.get(r.project_id) ?? 0) + 1);
  return map;
}
