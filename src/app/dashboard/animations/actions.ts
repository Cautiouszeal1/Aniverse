"use server";

import { createHash } from "node:crypto";
import { refresh } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { ASPECTS, DURATIONS, type QualityId } from "@/lib/animation/options";
import { buildScenePrompt } from "@/lib/animation/prompt";
import { isStoragePath } from "@/lib/images/paths";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { str } from "@/lib/validation";
import { failPaidJob, paidJobMessage, startPaidJob } from "@/server/jobs/paid";
import { AV_VIDEO_MODELS, AV_VIDEO_PROVIDER_ID, videoMode } from "@/server/providers/video";
import { renderClipJob, type ClipJobInput } from "@/server/video/render";
import { deleteVideo } from "@/server/video/storage";

const UUID_RE = /^[0-9a-f-]{36}$/i;
const MAX_CLIPS_PER_HOUR = 20;

export type ClipState = { ok?: boolean; message?: string; error?: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function seedFrom(key: string) {
  return parseInt(createHash("sha256").update(key).digest("hex").slice(0, 8), 16) % 2_000_000_000;
}

export async function generateClip(_: ClipState, form: FormData): Promise<ClipState> {
  const projectId = str(form, "projectId");
  const sceneId = str(form, "sceneId");
  const quality = str(form, "quality") as QualityId;
  const aspect = str(form, "aspect") as ClipJobInput["aspect"];
  const duration = Number(str(form, "duration"));
  const extra = str(form, "extra").slice(0, 300);
  const requestKey = str(form, "requestKey");

  if (!UUID_RE.test(projectId) || !UUID_RE.test(sceneId)) return { error: "This scene could not be found." };
  if (!/^[A-Za-z0-9-]{8,64}$/.test(requestKey)) return { error: "Please reload the page and try again." };
  if (!ASPECTS.some((a) => a.id === aspect)) return { error: "Choose a shape." };

  const { supabase, user } = await requireUser();

  const { data: price } = await supabase
    .from("ai_prices")
    .select("id, credits_per_clip, max_seconds, enabled")
    .eq("id", quality)
    .maybeSingle();
  if (!price || !price.enabled) return { error: "Choose a quality." };
  if (!DURATIONS[quality]?.includes(duration) || duration > price.max_seconds) return { error: "Choose a clip length." };

  // Scene must belong to this user's project (row-level security checks ownership).
  const { data: scene } = await supabase
    .from("storyboard_scenes")
    .select("id, title, description, dialogue, shot_type, camera_notes, character_ids, storyboard_id, storyboards!inner(project_id)")
    .eq("id", sceneId)
    .maybeSingle();
  const sceneProject = (scene?.storyboards as unknown as { project_id: string } | null)?.project_id;
  if (!scene || sceneProject !== projectId) return { error: "This scene could not be found." };
  if (!(scene.description || scene.title).trim()) return { error: "Describe what happens in this scene first (on the storyboard)." };

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("animation_clips")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_CLIPS_PER_HOUR) return { error: "You've reached the hourly animation limit. Please try again later." };

  // Characters in the scene: their look goes into the prompt, and the first
  // one's picture is the clip's starting frame for consistency.
  const ids = ((scene.character_ids ?? []) as string[]).slice(0, 4);
  const characters: { name: string; look: string; image: string | null }[] = [];
  if (ids.length) {
    const { data: chars } = await supabase.from("characters").select("id, name").in("id", ids);
    const { data: versions } = await supabase
      .from("character_versions")
      .select("character_id, prompt, image_path, version")
      .in("character_id", ids)
      .order("version", { ascending: false });
    for (const id of ids) {
      const c = chars?.find((x) => x.id === id);
      if (!c) continue;
      const v = versions?.find((x) => x.character_id === id);
      characters.push({ name: c.name, look: v?.prompt ?? "", image: isStoragePath(v?.image_path) ? v!.image_path : null });
    }
  }

  const prompt = buildScenePrompt(scene, characters, extra);
  const input: ClipJobInput & { scene_id: string } = {
    quality,
    prompt,
    durationSeconds: duration,
    aspect,
    seed: seedFrom(requestKey),
    startImagePath: quality === "motion-standard" ? characters.find((c) => c.image)?.image ?? null : null,
    scene_id: sceneId,
  };

  if (!isAdminConfigured()) return { error: "Animation isn't switched on yet on this server." };
  const admin = createAdminClient();

  // ---- Labelled demo: no AI, no charge, no fake video. ----
  if (videoMode() === "demo") {
    const { data: existing } = await admin.from("generation_jobs").select("id").eq("idempotency_key", requestKey).maybeSingle();
    let jobId = existing?.id as string | undefined;
    if (!jobId) {
      const { data: job, error } = await admin
        .from("generation_jobs")
        .insert({
          owner_id: user.id, project_id: projectId, kind: "scene_video", status: "completed",
          provider: "demo", model: "demo", is_demo: true, input, output: {},
          estimated_credits: 0, charged_credits: 0, idempotency_key: requestKey, completed_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error || !job) return { error: "Couldn't create the demo preview." };
      jobId = job.id;
    }
    await admin.rpc("create_animation_clip", {
      p_owner: user.id, p_project: projectId, p_scene: sceneId, p_job: jobId, p_quality: quality,
      p_prompt: prompt, p_duration: duration, p_aspect: aspect, p_is_demo: true,
    });
    refresh();
    return { ok: true, message: "Demo preview added. Real AI animation turns on when the video engine is connected." };
  }

  // ---- Real, paid clip ----
  const started = await startPaidJob({
    userId: user.id, projectId, kind: "scene_video", service: "video",
    provider: AV_VIDEO_PROVIDER_ID, model: AV_VIDEO_MODELS[quality], input,
    credits: price.credits_per_clip, requestKey,
  });
  if (!started.ok) return { error: paidJobMessage(started.code) };

  const { error: clipError } = await admin.rpc("create_animation_clip", {
    p_owner: user.id, p_project: projectId, p_scene: sceneId, p_job: started.jobId, p_quality: quality,
    p_prompt: prompt, p_duration: duration, p_aspect: aspect, p_is_demo: false,
  });
  if (clipError) {
    const refunded = await failPaidJob(started.jobId, "could not create clip");
    return { error: paidJobMessage("failed", refunded) };
  }

  // Render in the background: keeps going if the user leaves the page.
  after(() => renderClipJob(started.jobId));

  refresh();
  return {
    ok: true,
    message: `Animating… ${price.credits_per_clip} credits reserved. This usually takes 1–3 minutes — you can leave this page. If it fails, the credits come back automatically.`,
  };
}

export async function deleteClip(form: FormData): Promise<void> {
  const clipId = str(form, "clipId");
  if (!UUID_RE.test(clipId)) return;
  const { supabase } = await requireUser();
  const { data: clip } = await supabase
    .from("animation_clips")
    .select("id, video_path, generation_jobs!inner(status)")
    .eq("id", clipId)
    .maybeSingle();
  if (!clip) return;
  const status = (clip.generation_jobs as unknown as { status: string }).status;
  if (status === "processing" || status === "queued") return; // finish or refund first
  if (clip.video_path) await deleteVideo(supabase, clip.video_path);
  await supabase.from("animation_clips").delete().eq("id", clipId);
  refresh();
}
