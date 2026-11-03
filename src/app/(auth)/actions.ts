"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TERMS_VERSION } from "@/lib/supabase/config";
import {
  type FormState,
  friendlyAuthError,
  str,
  validateEmail,
  validateNewPassword,
} from "@/lib/validation";

async function siteOrigin(): Promise<string> {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const email = str(form, "email").toLowerCase();
  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : "";
  const displayName = str(form, "displayName").slice(0, 60);
  const accepted = form.get("terms") === "on";

  const fieldErrors: Record<string, string> = {};
  const e = validateEmail(email);
  if (e) fieldErrors.email = e;
  const p = validateNewPassword(password);
  if (p) fieldErrors.password = p;
  if (!accepted) fieldErrors.terms = "Please accept the Terms and Privacy notice.";
  if (Object.keys(fieldErrors).length)
    return { fieldErrors, values: { email, displayName } };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${await siteOrigin()}/auth/confirm?next=/dashboard`,
      data: { display_name: displayName || null, terms_version: TERMS_VERSION },
    },
  });

  if (error) {
    return { error: friendlyAuthError(error.message), values: { email, displayName } };
  }

  // Same message whether or not the address already has an account, so the
  // form can't be used to discover who is registered.
  return {
    ok: true,
    message: `We've sent a confirmation link to ${email}. Open it to activate your account. If you already have an account, sign in or reset your password instead.`,
  };
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const email = str(form, "email").toLowerCase();
  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : "";
  const next = safeNext(form.get("next"));

  const fieldErrors: Record<string, string> = {};
  const e = validateEmail(email);
  if (e) fieldErrors.email = e;
  if (!password) fieldErrors.password = "Enter your password.";
  if (Object.keys(fieldErrors).length) return { fieldErrors, values: { email } };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: friendlyAuthError(error.message), values: { email } };

  redirect(next);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  const email = str(form, "email").toLowerCase();
  const e = validateEmail(email);
  if (e) return { fieldErrors: { email: e }, values: { email } };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteOrigin()}/auth/confirm?next=/reset-password`,
  });
  if (error && /rate|too many/i.test(error.message)) {
    return { error: friendlyAuthError(error.message), values: { email } };
  }
  return {
    ok: true,
    message: `If an account exists for ${email}, a password reset link is on its way. The link expires after a short time.`,
  };
}

export async function updatePassword(_: FormState, form: FormData): Promise<FormState> {
  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : "";
  const confirm = typeof form.get("confirm") === "string" ? (form.get("confirm") as string) : "";

  const p = validateNewPassword(password);
  if (p) return { fieldErrors: { password: p } };
  if (password !== confirm) return { fieldErrors: { confirm: "Passwords don't match." } };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: "Your reset link has expired or was already used. Request a new one.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: friendlyAuthError(error.message) };
  return { ok: true, message: "Your password has been updated." };
}
