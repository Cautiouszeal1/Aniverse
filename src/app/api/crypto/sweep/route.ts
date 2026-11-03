import { connection, NextResponse, type NextRequest } from "next/server";
import { isAdminConfigured } from "@/lib/supabase/admin";
import { sweep } from "@/server/crypto/watcher";

export const maxDuration = 60;

/**
 * Background payment watcher. Called every minute by the database scheduler
 * (pg_cron) and daily by Vercel Cron, with `Authorization: Bearer CRON_SECRET`.
 */
async function handle(req: NextRequest) {
  await connection();
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "payments not configured" }, { status: 503 });
  }
  try {
    const result = await sweep({ force: true });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[crypto-sweep]", e);
    return NextResponse.json({ ok: false, error: "sweep failed, will retry" }, { status: 502 });
  }
}

export const GET = handle;
export const POST = handle;
