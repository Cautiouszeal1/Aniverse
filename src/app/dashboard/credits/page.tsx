import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader, PanelSkeleton } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { getCreditBalance } from "@/lib/auth";
import { formatDate, listLedger, listPacks, usd } from "@/lib/data";

export const metadata: Metadata = { title: "Credits & Billing" };

const REASON_LABEL: Record<string, string> = {
  purchase: "Credit pack purchase",
  generation: "Generation",
  refund: "Refund",
  adjustment: "Adjustment",
  welcome: "Welcome credits",
};

export default function CreditsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Credits & Billing" description="Credits pay for AI generations. You only spend credits when you generate." />
      <Suspense fallback={<PanelSkeleton rows={3} />}>
        <Credits />
      </Suspense>
    </div>
  );
}

async function Credits() {
  const [balance, packs, ledger] = await Promise.all([getCreditBalance(), listPacks(), listLedger()]);
  return (
    <>
      <section className="panel flex flex-col gap-2 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-silver-400">Current balance</p>
          <p className="mt-1 font-display text-4xl font-semibold tabular-nums text-white">
            {balance.toLocaleString("en-US")} <span className="text-lg text-silver-400">credits</span>
          </p>
        </div>
        <p className="max-w-xs text-sm text-silver-500">
          Each generation shows its credit cost before you confirm. Failed generations are not charged.
        </p>
      </section>

      <section aria-labelledby="packs-title">
        <h2 id="packs-title" className="mb-4 text-lg font-semibold">Credit packs</h2>
        <ul className="grid gap-4 md:grid-cols-2">
          {packs.map((p) => (
            <li key={p.id} className="panel p-6">
              <div className="flex items-baseline justify-between">
                <h3 className="text-xl font-semibold">{p.name}</h3>
                <p className="font-display text-2xl font-semibold text-white">{usd(p.price_usd_cents)}</p>
              </div>
              <p className="mt-2 text-silver-300">{p.credits.toLocaleString("en-US")} credits</p>
              <Button className="mt-5 w-full" disabledReason="Payments switch on in Milestone 6">
                Buy pack
              </Button>
              <p className="mt-2 text-center text-xs text-silver-500">Payments switch on soon.</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="history-title" className="panel p-6">
        <h2 id="history-title" className="text-lg font-semibold">History</h2>
        {ledger.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-silver-500">
                <tr>
                  <th scope="col" className="py-2 font-medium">Date</th>
                  <th scope="col" className="py-2 font-medium">Description</th>
                  <th scope="col" className="py-2 text-right font-medium">Credits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-silver-300/10">
                {ledger.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap py-2.5 pr-3 text-silver-400">{formatDate(e.created_at)}</td>
                    <td className="py-2.5 text-silver-200">{e.note || REASON_LABEL[e.reason] || e.reason}</td>
                    <td className={`py-2.5 text-right tabular-nums ${e.delta > 0 ? "text-emerald-300" : "text-silver-200"}`}>
                      {e.delta > 0 ? "+" : ""}
                      {e.delta.toLocaleString("en-US")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-silver-500">No credit activity yet.</p>
        )}
      </section>
    </>
  );
}
