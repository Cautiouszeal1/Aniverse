import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Downloads everything AniVerse stores about the signed-in user, as JSON. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  // Row-level security limits every query to this user's own rows.
  const [profile, projects, characters, versions, storyboards, scenes, clips, ledger, jobs, reports] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("projects").select("*"),
    supabase.from("characters").select("*"),
    supabase.from("character_versions").select("*"),
    supabase.from("storyboards").select("*"),
    supabase.from("storyboard_scenes").select("*"),
    supabase.from("animation_clips").select("*"),
    supabase.from("credit_ledger").select("delta, reason, note, created_at"),
    supabase.from("generation_jobs").select("id, project_id, kind, status, is_demo, input, charged_credits, refunded_credits, created_at, completed_at"),
    supabase.from("content_reports").select("category, target, details, status, created_at"),
  ]);

  // Keep internal engine identifiers out of the export.
  const neutral = <T extends Record<string, unknown>>(rows: T[] | null) =>
    (rows ?? []).map((r) => {
      const { provider: _p, model: _m, ...rest } = r as T & { provider?: unknown; model?: unknown };
      void _p;
      void _m;
      return rest;
    });

  const body = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email, created_at: user.created_at },
    profile: profile.data,
    projects: projects.data ?? [],
    characters: characters.data ?? [],
    character_versions: neutral(versions.data),
    storyboards: storyboards.data ?? [],
    storyboard_scenes: scenes.data ?? [],
    animation_clips: clips.data ?? [],
    generation_jobs: jobs.data ?? [],
    credit_history: ledger.data ?? [],
    reports_filed: reports.data ?? [],
    note: "Image and video files are listed by their private storage path. Download them from the app while signed in.",
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="aniverse-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
