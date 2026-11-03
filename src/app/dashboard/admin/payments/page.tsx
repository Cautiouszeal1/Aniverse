import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader, PanelSkeleton } from "@/components/dashboard/page-header";
import { SubmitButton } from "@/components/ui/form";
import { explorerTx, formatUnits, shortAddress } from "@/lib/crypto/format";
import { formatDate } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { resolvePayment } from "./actions";

export const metadata: Metadata = { title: "Admin · Payments", robots: { index: false } };

export default function AdminPayments() {
  return (
    <div className="space-y-8">
      <PageHeader title="Payments (admin)" description="Every USDC payment AniVerse has seen, and orders waiting for payment." />
      <Suspense fallback={<PanelSkeleton rows={3} />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) notFound();

  const [{ data: payments }, { data: openOrders }, { data: settings }] = await Promise.all([
    supabase
      .from("crypto_payments")
      .select("id, chain, tx_hash, from_address, units, status, created_at, order_id")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("crypto_orders")
      .select("id, owner_id, credits, amount_units, token_decimals, status, created_at")
      .in("status", ["pending", "expired"])
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("payment_settings").select("chain, receive_address, token_symbol, enabled").single(),
  ]);

  const unmatched = (payments ?? []).filter((p) => p.status === "unmatched");
  const total = (payments ?? [])
    .filter((p) => p.status !== "unmatched")
    .reduce((t, p) => t + BigInt(p.units), BigInt(0));

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="panel p-5">
          <p className="text-sm text-silver-400">Receiving wallet</p>
          <p className="mt-2 font-mono text-sm text-white">{settings ? shortAddress(settings.receive_address) : "—"}</p>
          <p className="mt-1 text-xs text-silver-500">{settings?.chain} · {settings?.enabled ? "accepting payments" : "paused"}</p>
        </div>
        <div className="panel p-5">
          <p className="text-sm text-silver-400">Received (last 50 payments)</p>
          <p className="mt-2 font-display text-2xl font-semibold text-white">{formatUnits(total, 6)} USDC</p>
        </div>
        <div className="panel p-5">
          <p className="text-sm text-silver-400">Need your attention</p>
          <p className={`mt-2 font-display text-2xl font-semibold ${unmatched.length ? "text-amber-200" : "text-white"}`}>{unmatched.length}</p>
        </div>
      </section>

      {unmatched.length ? (
        <section className="panel p-6" aria-labelledby="unmatched-title">
          <h2 id="unmatched-title" className="text-lg font-semibold">Payments that didn&apos;t match an order</h2>
          <p className="mt-1 text-sm text-silver-400">Usually someone rounded the amount. Pick their order to credit them.</p>
          <ul className="mt-4 space-y-3">
            {unmatched.map((p) => (
              <li key={p.id} className="rounded-xl border border-amber-400/25 bg-amber-400/5 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className="font-semibold text-white">{formatUnits(p.units, 6)} USDC</span>
                  <span className="text-silver-400">from {shortAddress(p.from_address)} · {formatDate(p.created_at)}</span>
                  <a href={explorerTx(p.chain, p.tx_hash)} target="_blank" rel="noreferrer" className="text-cyan-300">Transaction ↗</a>
                </div>
                {openOrders?.length ? (
                  <form action={resolvePayment} className="mt-3 flex flex-wrap gap-2">
                    <input type="hidden" name="paymentId" value={p.id} />
                    <label htmlFor={`o-${p.id}`} className="sr-only">Order to credit</label>
                    <select id={`o-${p.id}`} name="orderId" className="h-10 min-w-0 flex-1 rounded-xl border border-silver-300/15 bg-navy-950/60 px-3 text-sm text-white">
                      {openOrders.map((o) => (
                        <option key={o.id} value={o.id}>
                          {formatUnits(String(o.amount_units), o.token_decimals)} USDC · {o.credits} credits · {o.status} · {formatDate(o.created_at)}
                        </option>
                      ))}
                    </select>
                    <SubmitButton pendingText="Crediting…" className="h-10">Credit this order</SubmitButton>
                  </form>
                ) : (
                  <p className="mt-2 text-xs text-silver-500">No open orders to match. Ask the customer to start a payment, then credit it here.</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="panel p-6" aria-labelledby="recent-title">
        <h2 id="recent-title" className="text-lg font-semibold">Recent payments</h2>
        {payments?.length ? (
          <ul className="mt-4 divide-y divide-silver-300/10 text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="text-silver-100">{formatUnits(p.units, 6)} USDC</span>
                <span className="text-xs text-silver-500">{shortAddress(p.from_address)} · {formatDate(p.created_at)}</span>
                <span className="text-xs text-silver-300">{p.status}</span>
                <a href={explorerTx(p.chain, p.tx_hash)} target="_blank" rel="noreferrer" className="text-xs text-cyan-300">↗</a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-silver-500">No payments yet.</p>
        )}
      </section>
    </>
  );
}
