"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type FormState, str } from "@/lib/validation";

const CREATOR_TYPES = [
  "beginner",
  "content_creator",
  "independent_animator",
  "studio",
  "other",
] as const;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return { supabase, user };
}

export async function saveProfile(_: FormState, form: FormData): Promise<FormState> {
  const displayName = str(form, "displayName").slice(0, 60);
  const creatorType = str(form, "creatorType");
  const completeOnboarding = form.get("onboarding") === "1";

  if (creatorType && !CREATOR_TYPES.includes(creatorType as (typeof CREATOR_TYPES)[number])) {
    return { fieldErrors: { creatorType: "Choose one of the options." } };
  }

  const { supabase, user } = await requireUser();
  const update: Record<string, string | null> = {
    display_name: displayName || null,
    creator_type: creatorType || null,
  };
  if (completeOnboarding) update.onboarded_at = new Date().toISOString();

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) return { error: "Couldn't save your profile. Please try again." };

  refresh();
  return { ok: true, message: "Profile saved." };
}

export async function skipOnboarding(): Promise<void> {
  const { supabase, user } = await requireUser();
  await supabase
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", user.id);
  refresh();
}

export async function createProject(_: FormState, form: FormData): Promise<FormState> {
  const title = str(form, "title");
  const description = str(form, "description");
  if (!title) return { fieldErrors: { title: "Give your project a name." }, values: { title, description } };
  if (title.length > 120)
    return { fieldErrors: { title: "Keep the name under 120 characters." }, values: { title, description } };
  if (description.length > 2000)
    return { fieldErrors: { description: "Keep the description under 2,000 characters." }, values: { title, description } };

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("projects")
    .insert({ owner_id: user.id, title, description: description || null });
  if (error) return { error: "Couldn't create the project. Please try again.", values: { title, description } };

  refresh();
  return { ok: true, message: `“${title}” created.` };
}

export async function renameProject(_: FormState, form: FormData): Promise<FormState> {
  const id = str(form, "id");
  const title = str(form, "title");
  if (!title) return { fieldErrors: { title: "Name can't be empty." } };
  if (title.length > 120) return { fieldErrors: { title: "Keep it under 120 characters." } };

  const { supabase } = await requireUser();
  // RLS limits the update to the caller's own rows; .select() confirms a row changed.
  const { data, error } = await supabase
    .from("projects")
    .update({ title })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return { error: "Couldn't rename this project." };

  refresh();
  return { ok: true, message: "Renamed." };
}

export async function setProjectStatus(form: FormData): Promise<void> {
  const id = str(form, "id");
  const status = str(form, "status");
  if (status !== "active" && status !== "archived") return;
  const { supabase } = await requireUser();
  await supabase.from("projects").update({ status }).eq("id", id);
  refresh();
}

export async function deleteProject(form: FormData): Promise<void> {
  const id = str(form, "id");
  const confirmTitle = str(form, "confirmTitle");
  const { supabase } = await requireUser();
  const { data: project } = await supabase
    .from("projects")
    .select("title")
    .eq("id", id)
    .maybeSingle();
  if (!project || project.title !== confirmTitle) return;
  await supabase.from("projects").delete().eq("id", id);
  refresh();
}
