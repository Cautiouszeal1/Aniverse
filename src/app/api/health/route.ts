import { connection, NextResponse } from "next/server";

/**
 * Deployment health check. Reports only whether configuration is present —
 * never the values themselves.
 */
export async function GET() {
  await connection(); // always evaluate at request time
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  return NextResponse.json({
    ok: true,
    supabaseUrlSet: Boolean(url),
    supabaseUrlLooksValid: /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url),
    publishableKeySet: Boolean(publishable),
    publishableKeyLooksValid: publishable.startsWith("sb_publishable_") || publishable.startsWith("eyJ"),
    anonKeySet: Boolean(anon),
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  });
}
