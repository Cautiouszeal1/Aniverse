import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { Suspense } from "react";
import { PageHeader, PanelSkeleton } from "@/components/dashboard/page-header";
import { PayPanel } from "@/components/credits/pay-panel";
import { paymentUri } from "@/lib/crypto/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Pay with USDC" };

export default function PayPage({ params }: PageProps<"/dashboard/credits/pay/[id]">) {
  return (
    <Suspense fallback={<PanelSkeleton rows={2} />}>
      <Pay params={params} />
    </Suspense>
  );
}

async function Pay({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: o } = await supabase
    .from("crypto_orders")
    .select("id, status, chain, chain_id, token_symbol, token_address, token_decimals, receive_address, amount_units, credits, expires_at, tx_hash, price_usd_cents")
    .eq("id", id)
    .maybeSingle();
  if (!o) notFound();

  const uri = paymentUri({
    tokenAddress: o.token_address,
    chainId: o.chain_id,
    receiveAddress: o.receive_address,
    units: String(o.amount_units),
  });
  const qrSvg = await QRCode.toString(uri, { type: "svg", margin: 0, errorCorrectionLevel: "M" });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/credits" className="text-sm text-silver-400 hover:text-white">← Credits &amp; Billing</Link>
        <div className="mt-3">
          <PageHeader title="Pay with USDC" description={`${o.credits.toLocaleString("en-US")} credits · $${(o.price_usd_cents / 100).toFixed(2)}`} />
        </div>
      </div>
      <PayPanel
        qrSvg={qrSvg}
        order={{
          id: o.id,
          status: o.status,
          chain: o.chain,
          chainId: o.chain_id,
          token: o.token_symbol,
          tokenAddress: o.token_address,
          decimals: o.token_decimals,
          receiveAddress: o.receive_address,
          units: String(o.amount_units),
          credits: o.credits,
          expiresAt: o.expires_at,
          txHash: o.tx_hash,
        }}
      />
    </div>
  );
}
