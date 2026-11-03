"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import {
  ASPECTS,
  MOODS,
  STYLES,
  VARIATIONS_PER_GENERATION,
  type AspectId,
  type MoodId,
  type StyleId,
} from "@/lib/characters/options";
import { createClient } from "@/lib/supabase/server";
import { str } from "@/lib/validation";
import { getImageProvider } from "@/server/providers/image";

const UUID_RE = /^[0-9a-f-]{36}$/i;
const MAX_JOBS_PER_HOUR = 40;

export type GenerateState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: { prompt: string; style: string; mood: string; aspect: string };
  job?: {
    id: string;
    isDemo: boolean;
    label: string;
    provider: string;
    model: string;
    credits: number;
    input: { prompt: string; style: StyleId; mood: MoodId; aspect: AspectId };
    images: { seed: string; imageUrl?: string }[];
  };
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function generateCharacter(_: GenerateState, form: FormData): Promise<GenerateState> {
  const projectId = str(form, "projectId");
  const prompt = str(form, "prompt");
  const style = str(form, "style") as StyleId;
  const mood = str(form, "mood") as MoodId;
  const aspect = str(form, "aspect") as AspectId;
  const requestKey = str(form, "requestKey");
  const values = { prompt, style, mood, aspect };

  const fieldErrors: Record<string, string> = {};
  if (prompt.length < 3) fieldErrors.prompt = "Describe your character in a few words.";
  if (prompt.length > 1000) fieldErrors.prompt = "Keep the description under 1,000 characters.";
  if (!STYLES.some((s) => s.id === style)) fieldErrors.style = "Choose a style.";
  if (!MOODS.some((m) => m.id === mood)) fieldErrors.mood = "Choose a mood.";
  if (!ASPECTS.some((a) => a.id === aspect)) fieldErrors.aspect = "Choose a shape.";
  if (!UUID_RE.test(projectId)) return { error: "This project could not be found.", values };
  if (!/^[A-Za-z0-9-]{8,64}$/.test(requestKey)) return { error: "Please reload the page and try again.", values };
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const { supabase, user } = await requireUser();

  // Same click submitted twice (double-tap, retry): return the existing job.
  const { data: existing } = await supabase
    .from("generation_jobs")
    .select("id, provider, model, is_demo, estimated_credits, input, output")
    .eq("idempotency_key", requestKey)
    .maybeSingle();
  if (existing) {
    return {
      values,
      job: {
        id: existing.id,
        isDemo: existing.is_demo,
        label: existing.is_demo ? "Demo" : "Free AI (beta)",
        provider: existing.provider,
        model: existing.model,
        credits: existing.estimated_credits,
        input: { prompt, style, mood, aspect },
        images: (existing.output?.images ?? []) as { seed: string; imageUrl?: string }[],
      },
    };
  }

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("generation_jobs")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_JOBS_PER_HOUR) {
    return { error: "You've reached the hourly generation limit. Please try again a little later.", values };
  }

  const provider = getImageProvider();
  const input = { prompt, style, mood, aspectRatio: aspect, variations: VARIATIONS_PER_GENERATION };
  const credits = provider.estimateCredits(input);

  if (credits > 0) {
    // Paid generation needs the server-side credit flow (Milestone 6).
    return { error: "Paid AI generation isn't switched on yet.", values };
  }

  let result;
  try {
    result = await provider.generate(input, { idempotencyKey: requestKey });
  } catch {
    return { error: "Generation failed. You were not charged. Please try again.", values };
  }

  const now = new Date().toISOString();
  const { data: job, error } = await supabase
    .from("generation_jobs")
    .insert({
      owner_id: user.id,
      project_id: projectId,
      kind: "character_image",
      status: "completed",
      provider: provider.id,
      model: provider.model,
      is_demo: provider.isDemo,
      input,
      output: { images: result.images },
      estimated_credits: credits,
      charged_credits: 0,
      idempotency_key: requestKey,
      completed_at: now,
    })
    .select("id")
    .single();

  if (error || !job) {
    return { error: "Couldn't start the generation for this project.", values };
  }

  return {
    values,
    job: {
      id: job.id,
      isDemo: provider.isDemo,
      label: provider.label,
      provider: provider.id,
      model: provider.model,
      credits,
      input: { prompt, style, mood, aspect },
      images: result.images,
    },
  };
}

/** Load a job owned by the user and confirm the chosen seed came from it. */
async function loadJobSeed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  jobId: string,
  seed: string,
) {
  if (!UUID_RE.test(jobId)) return null;
  const { data: job } = await supabase
    .from("generation_jobs")
    .select("id, project_id, provider, model, is_demo, input, output, status")
    .eq("id", jobId)
    .maybeSingle();
  if (!job || job.status !== "completed") return null;
  const image = ((job.output?.images ?? []) as { seed: string; imageUrl?: string }[]).find(
    (i) => i.seed === seed,
  );
  if (!image) return null;
  return { ...job, imageUrl: image.imageUrl ?? null };
}

export async function saveNewCharacter(form: FormData): Promise<void> {
  const jobId = str(form, "jobId");
  const seed = str(form, "seed");
  const name = str(form, "name").slice(0, 80) || "Untitled character";
  const { supabase, user } = await requireUser();

  const job = await loadJobSeed(supabase, jobId, seed);
  if (!job) return;

  const { data: character, error } = await supabase
    .from("characters")
    .insert({ owner_id: user.id, project_id: job.project_id, name })
    .select("id")
    .single();
  if (error || !character) return;

  await supabase.from("character_versions").insert({
    character_id: character.id,
    owner_id: user.id,
    version: 1,
    prompt: job.input.prompt,
    style: job.input.style,
    mood: job.input.mood,
    aspect_ratio: job.input.aspectRatio,
    provider: job.provider,
    model: job.model,
    is_demo: job.is_demo,
    seed,
    image_path: job.imageUrl,
    job_id: job.id,
  });

  redirect(`/dashboard/characters/${character.id}`);
}

export async function addCharacterVersion(form: FormData): Promise<void> {
  const characterId = str(form, "characterId");
  const jobId = str(form, "jobId");
  const seed = str(form, "seed");
  if (!UUID_RE.test(characterId)) return;
  const { supabase, user } = await requireUser();

  const job = await loadJobSeed(supabase, jobId, seed);
  if (!job) return;

  const { data: latest } = await supabase
    .from("character_versions")
    .select("version")
    .eq("character_id", characterId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("character_versions").insert({
    character_id: characterId,
    owner_id: user.id,
    version: (latest?.version ?? 0) + 1,
    prompt: job.input.prompt,
    style: job.input.style,
    mood: job.input.mood,
    aspect_ratio: job.input.aspectRatio,
    provider: job.provider,
    model: job.model,
    is_demo: job.is_demo,
    seed,
    image_path: job.imageUrl,
    job_id: job.id,
  });
  if (error) return;
  redirect(`/dashboard/characters/${characterId}`);
}

export async function renameCharacter(form: FormData): Promise<void> {
  const id = str(form, "id");
  const name = str(form, "name").slice(0, 80);
  if (!UUID_RE.test(id) || !name) return;
  const { supabase } = await requireUser();
  await supabase.from("characters").update({ name }).eq("id", id);
  refresh();
}

export async function deleteVersion(form: FormData): Promise<void> {
  const id = str(form, "id");
  const characterId = str(form, "characterId");
  if (!UUID_RE.test(id) || !UUID_RE.test(characterId)) return;
  const { supabase } = await requireUser();
  const { count } = await supabase
    .from("character_versions")
    .select("id", { count: "exact", head: true })
    .eq("character_id", characterId);
  if ((count ?? 0) <= 1) return; // keep at least one version; delete the character instead
  await supabase.from("character_versions").delete().eq("id", id);
  refresh();
}

export async function deleteCharacter(form: FormData): Promise<void> {
  const id = str(form, "id");
  const projectId = str(form, "projectId");
  if (!UUID_RE.test(id)) return;
  const { supabase } = await requireUser();
  await supabase.from("characters").delete().eq("id", id);
  redirect(UUID_RE.test(projectId) ? `/dashboard/projects/${projectId}` : "/dashboard/studio");
}
