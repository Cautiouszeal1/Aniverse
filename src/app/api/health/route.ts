import { connection, NextResponse } from "next/server";

/**
 * Public deployment health check. Reports only yes/no readiness — never
 * secret values or the names of underlying service providers.
 */
export async function GET() {
  await connection(); // always evaluate at request time
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const publicKey =
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim() ?? "";
  const aiKey = process.env.POLLINATIONS_API_KEY?.trim() ?? "";
  return NextResponse.json({
    ok: true,
    accounts: Boolean(url && publicKey),
    aiImages: aiKey.startsWith("sk_"),
    cryptoPayments: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    paymentWatcher: Boolean(process.env.CRON_SECRET?.trim()),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  });
}
