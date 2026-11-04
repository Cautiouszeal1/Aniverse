"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type FormState, str } from "@/lib/validation";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function requestDeletion(_: FormState, form: FormData): Promise<FormState> {
  if (str(form, "confirm") !== "DELETE") return { error: 'Type DELETE to confirm.' };
  const reason = str(form, "reason").slice(0, 1000) || null;
  const { supabase, user } = await requireUser();
  const { data: existing } = await supabase
    .from("account_deletion_requests")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();
  const { error } = existing
    ? await supabase.from("account_deletion_requests").update({ status: "pending", reason, requested_at: new Date().toISOString() }).eq("user_id", user.id)
    : await supabase.from("account_deletion_requests").insert({ user_id: user.id, reason });
  if (error) return { error: "Couldn't send the request. Please try again." };
  refresh();
  return { ok: true, message: "Request received. Your account will be deleted within 30 days." };
}

export async function cancelDeletion(): Promise<void> {
  const { supabase, user } = await requireUser();
  await supabase.from("account_deletion_requests").update({ status: "cancelled" }).eq("user_id", user.id);
  refresh();
}

export async function fileReport(_: FormState, form: FormData): Promise<FormState> {
  const category = str(form, "category");
  const target = str(form, "target").slice(0, 500);
  const details = str(form, "details").slice(0, 4000);
  const fieldErrors: Record<string, string> = {};
  if (!["copyright", "harmful", "impersonation", "other"].includes(category)) fieldErrors.category = "Choose a type.";
  if (!target) fieldErrors.target = "Say what you're reporting (a link or name).";
  if (details.length < 10) fieldErrors.details = "Tell us a bit more (at least 10 characters).";
  if (Object.keys(fieldErrors).length) return { fieldErrors, values: { category, target, details } };
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("content_reports").insert({ reporter_id: user.id, category, target, details });
  if (error) return { error: "Couldn't send the report. Please try again.", values: { category, target, details } };
  return { ok: true, message: "Thanks — your report was sent. We review every report." };
}
