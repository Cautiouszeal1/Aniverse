"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { MAX_SCENES, SHOT_TYPES } from "@/lib/storyboard/options";
import { createClient } from "@/lib/supabase/server";
import { type FormState, str } from "@/lib/validation";

const UUID_RE = /^[0-9a-f-]{36}$/i;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

type Supa = Awaited<ReturnType<typeof createClient>>;

async function orderedIds(supabase: Supa, storyboardId: string) {
  const { data } = await supabase
    .from("storyboard_scenes")
    .select("id")
    .eq("storyboard_id", storyboardId)
    .order("position", { ascending: true });
  return (data ?? []).map((r) => r.id as string);
}

async function reorder(supabase: Supa, storyboardId: string, ids: string[]) {
  await supabase.rpc("reorder_scenes", { p_storyboard_id: storyboardId, p_scene_ids: ids });
}

/** The storyboard of a scene the user owns (RLS-checked). */
async function sceneBoard(supabase: Supa, sceneId: string) {
  if (!UUID_RE.test(sceneId)) return null;
  const { data } = await supabase
    .from("storyboard_scenes")
    .select("id, storyboard_id, title, description, dialogue, shot_type, camera_notes, duration_seconds, character_ids")
    .eq("id", sceneId)
    .maybeSingle();
  return data;
}

export async function addScene(form: FormData): Promise<void> {
  const projectId = str(form, "projectId");
  if (!UUID_RE.test(projectId)) return;
  const { supabase, user } = await requireUser();

  let { data: board } = await supabase
    .from("storyboards")
    .select("id")
    .eq("project_id", projectId)
    .maybeSingle();
  if (!board) {
    const { data: created } = await supabase
      .from("storyboards")
      .insert({ owner_id: user.id, project_id: projectId })
      .select("id")
      .single();
    board = created;
  }
  if (!board) return;

  const ids = await orderedIds(supabase, board.id);
  if (ids.length >= MAX_SCENES) return;

  await supabase.from("storyboard_scenes").insert({
    storyboard_id: board.id,
    owner_id: user.id,
    position: ids.length,
    title: `Scene ${ids.length + 1}`,
  });
  refresh();
}

export async function updateScene(_: FormState, form: FormData): Promise<FormState> {
  const id = str(form, "id");
  const title = str(form, "title");
  const description = str(form, "description");
  const dialogue = str(form, "dialogue");
  const shotType = str(form, "shotType");
  const cameraNotes = str(form, "cameraNotes");
  const duration = Number(str(form, "duration"));
  const characterIds = form.getAll("characterIds").filter((v): v is string => typeof v === "string" && UUID_RE.test(v));

  const fieldErrors: Record<string, string> = {};
  if (title.length > 120) fieldErrors.title = "Keep the title under 120 characters.";
  if (description.length > 2000) fieldErrors.description = "Keep this under 2,000 characters.";
  if (dialogue.length > 2000) fieldErrors.dialogue = "Keep dialogue under 2,000 characters.";
  if (cameraNotes.length > 500) fieldErrors.cameraNotes = "Keep camera notes under 500 characters.";
  if (!SHOT_TYPES.some((s) => s.id === shotType)) fieldErrors.shotType = "Choose a shot type.";
  if (!Number.isFinite(duration) || duration <= 0 || duration > 120)
    fieldErrors.duration = "Use 0.5 to 120 seconds.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("storyboard_scenes")
    .update({
      title,
      description,
      dialogue,
      shot_type: shotType,
      camera_notes: cameraNotes,
      duration_seconds: Math.round(duration * 10) / 10,
      character_ids: [...new Set(characterIds)],
    })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return { error: "Couldn't save this scene. Please try again." };
  refresh();
  return { ok: true, message: "Saved" };
}

export async function moveScene(form: FormData): Promise<void> {
  const id = str(form, "id");
  const dir = str(form, "dir");
  const { supabase } = await requireUser();
  const scene = await sceneBoard(supabase, id);
  if (!scene) return;
  const ids = await orderedIds(supabase, scene.storyboard_id);
  const i = ids.indexOf(id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await reorder(supabase, scene.storyboard_id, ids);
  refresh();
}

export async function duplicateScene(form: FormData): Promise<void> {
  const id = str(form, "id");
  const { supabase, user } = await requireUser();
  const scene = await sceneBoard(supabase, id);
  if (!scene) return;
  const ids = await orderedIds(supabase, scene.storyboard_id);
  if (ids.length >= MAX_SCENES) return;

  const { data: copy } = await supabase
    .from("storyboard_scenes")
    .insert({
      storyboard_id: scene.storyboard_id,
      owner_id: user.id,
      position: ids.length,
      title: `${scene.title || "Scene"} (copy)`.slice(0, 120),
      description: scene.description,
      dialogue: scene.dialogue,
      shot_type: scene.shot_type,
      camera_notes: scene.camera_notes,
      duration_seconds: scene.duration_seconds,
      character_ids: scene.character_ids,
    })
    .select("id")
    .single();
  if (!copy) return;
  const i = ids.indexOf(id);
  ids.splice(i + 1, 0, copy.id);
  await reorder(supabase, scene.storyboard_id, ids);
  refresh();
}

export async function deleteScene(form: FormData): Promise<void> {
  const id = str(form, "id");
  const { supabase } = await requireUser();
  const scene = await sceneBoard(supabase, id);
  if (!scene) return;
  await supabase.from("storyboard_scenes").delete().eq("id", id);
  const ids = await orderedIds(supabase, scene.storyboard_id);
  if (ids.length) await reorder(supabase, scene.storyboard_id, ids);
  refresh();
}

export async function saveVersion(_: FormState, form: FormData): Promise<FormState> {
  const storyboardId = str(form, "storyboardId");
  const label = str(form, "label").slice(0, 80) || `Version ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;
  if (!UUID_RE.test(storyboardId)) return { error: "Storyboard not found." };
  const { supabase, user } = await requireUser();

  const { data: scenes, error } = await supabase
    .from("storyboard_scenes")
    .select("title, description, dialogue, shot_type, camera_notes, duration_seconds, character_ids")
    .eq("storyboard_id", storyboardId)
    .order("position", { ascending: true });
  if (error) return { error: "Couldn't read the storyboard." };
  if (!scenes?.length) return { error: "Add at least one scene before saving a version." };

  const { error: insErr } = await supabase.from("storyboard_revisions").insert({
    storyboard_id: storyboardId,
    owner_id: user.id,
    label,
    scenes,
    scene_count: scenes.length,
  });
  if (insErr) return { error: "Couldn't save this version." };
  refresh();
  return { ok: true, message: `Saved “${label}”.` };
}

export async function restoreVersion(form: FormData): Promise<void> {
  const id = str(form, "id");
  if (!UUID_RE.test(id)) return;
  const { supabase } = await requireUser();
  await supabase.rpc("restore_storyboard_revision", { p_revision_id: id });
  refresh();
}

export async function deleteVersion(form: FormData): Promise<void> {
  const id = str(form, "id");
  if (!UUID_RE.test(id)) return;
  const { supabase } = await requireUser();
  await supabase.from("storyboard_revisions").delete().eq("id", id);
  refresh();
}
