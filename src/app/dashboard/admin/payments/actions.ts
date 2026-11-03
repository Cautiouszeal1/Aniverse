"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { str } from "@/lib/validation";

export async function resolvePayment(form: FormData): Promise<void> {
  const paymentId = str(form, "paymentId");
  const orderId = str(form, "orderId");
  if (!/^[0-9a-f-]{36}$/i.test(paymentId) || !/^[0-9a-f-]{36}$/i.test(orderId)) return;
  const supabase = await createClient();
  await supabase.rpc("resolve_crypto_payment", { p_payment_id: paymentId, p_order_id: orderId });
  refresh();
}
