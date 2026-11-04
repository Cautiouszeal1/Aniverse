"use server";

import { refresh } from "next/cache";
import { notFound } from "next/navigation";
import { IMAGE_BUCKET } from "@/lib/images/paths";
import { VIDEO_BUCKET } from "@/lib/animation/options";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { type FormState, str } from "@/lib/validation";

const UUID_RE = /^[0-9a-f-]{36}$/i;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) notFound();
  return { supabase, user };
}

export async function setServicePaused(form: FormData): Promise<void> {
  const service = str(form, "service");
  const paused = str(form, "paused") === "true";
  if (!["image", "video"].includes(service)) return;
  const { supabase } = await requireAdmin();
  await supabase.rpc("set_ai_service_paused", { p_service: service, p_paused: paused, p_reason: paused ? "manual" : null });
  refresh();
}

export async function updatePrice(form: FormData): Promise<void> {
  const id = str(form, "id");
  const credits = Number(str(form, "credits"));
  const enabled = str(form, "enabled") === "on";
  if (!["motion-standard", "motion-pro"].includes(id)) return;
  if (!Number.isInteger(credits) || credits < 1 || credits > 100000) return;
  const { supabase, user } = await requireAdmin();
  await supabase.from("ai_prices").update({ credits_per_clip: credits, enabled, updated_at: new Date().toISOString() }).eq("id", id);
  await createAdminClient()
    .from("audit_events")
    .insert({ actor_id: user.id, action: "price.update", target_type: "price", target_id: id, details: { credits, enabled } });
  refresh();
}

export async function adjustCredits(_: FormState, form: FormData): Promise<FormState> {
  const userId = str(form, "userId");
  const delta = Number(str(form, "delta"));
  const note = str(form, "note");
  if (!UUID_RE.test(userId)) return { error: "Pick a user." };
  if (!Number.isInteger(delta) || delta === 0) return { error: "Enter a whole number, e.g. 500 or -100." };
  if (note.length < 3) return { error: "Write a short reason (it's kept in the audit log)." };
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_adjust_credits", { p_user_id: userId, p_delta: delta, p_note: note });
  if (error) {
    if (error.message.includes("would_go_negative")) return { error: "That would take the balance below zero." };
    return { error: "Couldn't adjust credits." };
  }
  refresh();
  return { ok: true, message: `Done. New balance: ${data} credits.` };
}

export async function updateReport(form: FormData): Promise<void> {
  const id = str(form, "id");
  const status = str(form, "status");
  const note = str(form, "note").slice(0, 1000);
  if (!UUID_RE.test(id) || !["open", "reviewing", "resolved", "rejected"].includes(status)) return;
  const { supabase } = await requireAdmin();
  await supabase.from("content_reports").update({ status, admin_note: note || null }).eq("id", id);
  refresh();
}

async function removeFolder(bucket: string, prefix: string) {
  const admin = createAdminClient();
  // Images live in <uid>/<job>/<file>; videos in <uid>/<file>.
  const { data: top } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
  const files: string[] = [];
  for (const item of top ?? []) {
    if (item.id) files.push(`${prefix}/${item.name}`);
    else {
      const { data: inner } = await admin.storage.from(bucket).list(`${prefix}/${item.name}`, { limit: 1000 });
      for (const f of inner ?? []) files.push(`${prefix}/${item.name}/${f.name}`);
    }
  }
  for (let i = 0; i < files.length; i += 100) await admin.storage.from(bucket).remove(files.slice(i, i + 100));
}

/** Permanently deletes a user who asked for it: files first, then the account (data cascades). */
export async function completeDeletion(form: FormData): Promise<void> {
  const userId = str(form, "userId");
  if (!UUID_RE.test(userId)) return;
  const { supabase, user } = await requireAdmin();
  if (userId === user.id) return; // never delete yourself from here
  const { data: request } = await supabase
    .from("account_deletion_requests")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();
  if (request?.status !== "pending") return;

  await removeFolder(IMAGE_BUCKET, userId);
  await removeFolder(VIDEO_BUCKET, userId);
  const admin = createAdminClient();
  await admin
    .from("audit_events")
    .insert({ actor_id: user.id, action: "account.delete", target_type: "user", target_id: userId, details: {} });
  await admin.auth.admin.deleteUser(userId);
  refresh();
}
