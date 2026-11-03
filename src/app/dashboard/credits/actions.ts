"use server";

import { redirect } from "next/navigation";
import { TX_HASH_RE } from "@/lib/crypto/format";
import { isAdminConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { str } from "@/lib/validation";
import { checkTransaction, sweep } from "@/server/crypto/watcher";

const UUID_RE = /^[0-9a-f-]{36}$/i;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export type StartState = { error?: string };

export async function startCryptoOrder(_: StartState, form: FormData): Promise<StartState> {
  const packId = str(form, "packId");
  if (!/^[a-z0-9-]{1,40}$/.test(packId)) return { error: "Choose a credit pack." };
  if (!isAdminConfigured()) return { error: "Crypto payments are switching on soon." };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("create_crypto_order", { p_pack_id: packId });
  if (error || !data) {
    const m = error?.message ?? "";
    if (m.includes("too_many_open_orders"))
      return { error: "You already have 3 open payments. Finish or cancel one first (see Payment history below)." };
    if (m.includes("payments_disabled")) return { error: "Crypto payments are paused. Please try again later." };
    return { error: "Couldn't start the payment. Please try again." };
  }
  redirect(`/dashboard/credits/pay/${(data as { id: string }).id}`);
}

export type OrderStatus = {
  status: "pending" | "paid" | "expired" | "cancelled" | "missing";
  txHash?: string | null;
};

async function readOrder(supabase: Awaited<ReturnType<typeof createClient>>, id: string): Promise<OrderStatus> {
  const { data } = await supabase.from("crypto_orders").select("status, tx_hash").eq("id", id).maybeSingle();
  if (!data) return { status: "missing" };
  return { status: data.status as OrderStatus["status"], txHash: data.tx_hash };
}

/** Polled by the payment page. Nudges the watcher, then reports status. */
export async function pollOrder(orderId: string): Promise<OrderStatus> {
  if (!UUID_RE.test(orderId)) return { status: "missing" };
  const { supabase } = await requireUser();
  const before = await readOrder(supabase, orderId);
  if (before.status !== "pending" && before.status !== "expired") return before;
  try {
    await sweep(); // rate-limited internally; the background job also runs every minute
  } catch (e) {
    console.error("[crypto-poll]", e);
  }
  return readOrder(supabase, orderId);
}

export type TxState = { message?: string; error?: string; ok?: boolean };

export async function submitTxHash(_: TxState, form: FormData): Promise<TxState> {
  const orderId = str(form, "orderId");
  const hash = str(form, "txHash");
  if (!TX_HASH_RE.test(hash)) return { error: "That doesn't look like a transaction hash (0x followed by 64 characters)." };
  const { supabase } = await requireUser();
  let r;
  try {
    r = await checkTransaction(hash.toLowerCase());
  } catch (e) {
    console.error("[crypto-tx]", e);
    return { error: "We couldn't reach the network right now. Your payment is safe; please try again in a minute." };
  }
  const order = await readOrder(supabase, orderId);
  if (order.status === "paid") return { ok: true, message: "Payment confirmed — credits added." };
  switch (r.state) {
    case "not_found":
      return { error: "This transaction isn't on Base yet. If you just sent it, wait a minute and try again." };
    case "failed":
      return { error: "This transaction failed on the network, so no money was sent." };
    case "not_to_us":
      return { error: "This transaction didn't send USDC on Base to the AniVerse address." };
    case "not_confirmed":
      return { message: "Found it! Waiting for network confirmation — this page will update automatically." };
    case "unmatched":
      return { error: "We received this payment but the amount didn't match an open order. Our team has been notified and will credit you manually." };
    default:
      return { message: "This payment was already recorded. If your credits haven't appeared, contact support." };
  }
}

export async function cancelOrder(form: FormData): Promise<void> {
  const id = str(form, "id");
  if (!UUID_RE.test(id)) return;
  const { supabase } = await requireUser();
  await supabase.rpc("cancel_crypto_order", { p_order_id: id });
  redirect("/dashboard/credits");
}
