import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdjustCreditsForm } from "@/components/admin/adjust-credits-form";
import { PageHeader, PanelSkeleton } from "@/components/dashboard/page-header";
import { ConfirmDelete } from "@/components/studio/confirm-delete";
import { SubmitButton } from "@/components/ui/form";
import { formatDate } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { completeDeletion, setServicePaused, updatePrice, updateReport } from "./actions";

export const metadata: Metadata = { title: "Admin console", robots: { index: false } };

export default function AdminConsole({ searchParams }: PageProps<"/dashboard/admin">) {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin console"
        description="Users, credits, AI services, prices, jobs and reports."
        action={
          <Link href="/dashboard/admin/payments" className="inline-flex h-11 items-center rounded-full border border-silver-300/20 px-5 text-sm text-silver-100 hover:border-cyan-400/50">
            Payments →
          </Link>
        }
      />
      <Suspense fallback={<PanelSkeleton rows={4} />}>
        <Console searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const box = "panel p-6";
const input = "h-10 rounded-xl border border-silver-300/15 bg-navy-950/60 px-3 text-sm text-white placeholder:text-silver-500";

async function Console({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) notFound();
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.slice(0, 120) ?? "";

  const [services, usage, prices, users, jobs, reports, deletions, audit] = await Promise.all([
    supabase.from("ai_service_status").select("service, paused, auto_paused, reason, balance_usd, min_balance_usd, updated_at").order("service"),
    supabase.rpc("admin_usage_report", { p_days: 30 }),
    supabase.from("ai_prices").select("id, label, credits_per_clip, max_seconds, enabled").order("sort_order"),
    supabase.rpc("admin_find_users", { p_query: q }),
    supabase
      .from("generation_jobs")
      .select("id, owner_id, kind, status, is_demo, charged_credits, refunded_credits, error, created_at")
      .order("created_at", { ascending: false })
      .limit(25),
    supabase.from("content_reports").select("id, category, target, details, status, admin_note, created_at").order("created_at", { ascending: false }).limit(30),
    supabase.from("account_deletion_requests").select("user_id, reason, status, requested_at").eq("status", "pending").order("requested_at"),
    supabase.from("audit_events").select("id, action, target_id, details, created_at").order("created_at", { ascending: false }).limit(15),
  ]);

  type UsageRow = { kind: string; jobs: number; completed: number; failed: number; credits_charged: number; credits_refunded: number };
  const usageRows = (usage.data ?? []) as UsageRow[];
  const net = usageRows.reduce((t, r) => t + Number(r.credits_charged) - Number(r.credits_refunded), 0);
  type UserRow = { user_id: string; email: string; display_name: string | null; created_at: string; balance: number; projects: number; jobs: number };
  const openReports = (reports.data ?? []).filter((r) => r.status === "open" || r.status === "reviewing");

  return (
    <div className="space-y-6">
      {/* AI services */}
      <section className={box} aria-labelledby="svc">
        <h2 id="svc" className="text-lg font-semibold">AI services</h2>
        <p className="mt-1 text-sm text-silver-400">While a service is paused nobody is charged and users see &ldquo;briefly unavailable&rdquo;. It pauses itself if the engine account runs out of funds.</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {(services.data ?? []).map((s) => (
            <li key={s.service} className="rounded-xl border border-silver-300/10 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium capitalize text-white">{s.service}</span>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs ${s.paused ? "border-amber-400/40 text-amber-200" : "border-emerald-400/30 text-emerald-200"}`}>
                  {s.paused ? `Paused${s.auto_paused ? " automatically" : ""}` : "Running"}
                </span>
              </div>
              <p className="mt-2 text-xs text-silver-500">
                {s.reason ? `Reason: ${s.reason === "low_balance" ? "engine account low on funds — top it up" : s.reason}. ` : ""}
                Updated {formatDate(s.updated_at)}
              </p>
              <form action={setServicePaused} className="mt-3">
                <input type="hidden" name="service" value={s.service} />
                <input type="hidden" name="paused" value={s.paused ? "false" : "true"} />
                <SubmitButton pendingText="Saving…" variant={s.paused ? "primary" : "secondary"} className="h-10">
                  {s.paused ? "Resume" : "Pause"}
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      </section>

      {/* Usage */}
      <section className={box} aria-labelledby="usage">
        <h2 id="usage" className="text-lg font-semibold">Usage · last 30 days</h2>
        <p className="mt-1 text-sm text-silver-400">
          Net credits spent: <span className="text-white">{net.toLocaleString("en-US")}</span> (≈ ${(net / 100).toFixed(2)} paid by users; about half covers AI costs).
        </p>
        {usageRows.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-silver-500">
                <tr><th className="py-2">Kind</th><th>Jobs</th><th>Done</th><th>Failed</th><th>Charged</th><th>Refunded</th></tr>
              </thead>
              <tbody className="divide-y divide-silver-300/10 text-silver-200">
                {usageRows.map((r) => (
                  <tr key={r.kind}>
                    <td className="py-2">{r.kind.replace("_", " ")}</td>
                    <td>{r.jobs}</td><td>{r.completed}</td><td>{r.failed}</td><td>{r.credits_charged}</td><td>{r.credits_refunded}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-silver-500">No generations yet.</p>
        )}
      </section>

      {/* Prices */}
      <section className={box} aria-labelledby="prices">
        <h2 id="prices" className="text-lg font-semibold">Animation prices</h2>
        <p className="mt-1 text-sm text-silver-400">1 credit = $0.01 paid by the user. Changes apply to new clips immediately.</p>
        <ul className="mt-4 space-y-3">
          {(prices.data ?? []).map((p) => (
            <li key={p.id}>
              <form action={updatePrice} className="flex flex-wrap items-center gap-3 rounded-xl border border-silver-300/10 p-4">
                <input type="hidden" name="id" value={p.id} />
                <span className="w-24 font-medium text-white">{p.label}</span>
                <label className="flex items-center gap-2 text-sm text-silver-300">
                  Credits per clip
                  <input name="credits" defaultValue={p.credits_per_clip} inputMode="numeric" className={`${input} w-24`} />
                </label>
                <span className="text-xs text-silver-500">= ${(p.credits_per_clip / 100).toFixed(2)} · up to {p.max_seconds}s</span>
                <label className="flex items-center gap-2 text-sm text-silver-300">
                  <input type="checkbox" name="enabled" defaultChecked={p.enabled} className="h-4 w-4 accent-cyan-400" /> On
                </label>
                <SubmitButton pendingText="Saving…" variant="secondary" className="h-10">Save</SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      </section>

      {/* Users */}
      <section className={box} aria-labelledby="users">
        <h2 id="users" className="text-lg font-semibold">Users</h2>
        <form className="mt-3 flex gap-2" role="search">
          <label htmlFor="q" className="sr-only">Search by email</label>
          <input id="q" name="q" defaultValue={q} placeholder="Search by email" className={`${input} min-w-0 flex-1`} />
          <button type="submit" className="h-10 rounded-full border border-silver-300/20 px-4 text-sm text-silver-100 hover:border-cyan-400/50">Search</button>
        </form>
        <ul className="mt-4 space-y-3">
          {((users.data ?? []) as UserRow[]).map((u) => (
            <li key={u.user_id} className="rounded-xl border border-silver-300/10 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="font-medium text-white">{u.email}</span>
                <span className="text-silver-400">
                  {u.balance} credits · {u.projects} projects · {u.jobs} jobs · joined {formatDate(u.created_at)}
                </span>
              </div>
              {u.display_name ? <p className="text-xs text-silver-500">{u.display_name}</p> : null}
              <AdjustCreditsForm userId={u.user_id} />
            </li>
          ))}
          {!users.data?.length ? <li className="text-sm text-silver-500">No users found.</li> : null}
        </ul>
      </section>

      {/* Jobs */}
      <section className={box} aria-labelledby="jobs">
        <h2 id="jobs" className="text-lg font-semibold">Recent jobs</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-silver-500">
              <tr><th className="py-2">When</th><th>Kind</th><th>Status</th><th>Credits</th><th>User</th><th>Note</th></tr>
            </thead>
            <tbody className="divide-y divide-silver-300/10 text-silver-200">
              {(jobs.data ?? []).map((j) => (
                <tr key={j.id}>
                  <td className="py-2 text-xs">{new Date(j.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</td>
                  <td>{j.kind.replace("_", " ")}{j.is_demo ? " (demo)" : ""}</td>
                  <td className={j.status === "failed" ? "text-rose-200" : j.status === "completed" ? "text-emerald-200" : "text-cyan-200"}>{j.status}</td>
                  <td>{j.charged_credits}{j.refunded_credits ? ` (−${j.refunded_credits} refunded)` : ""}</td>
                  <td className="font-mono text-xs">{j.owner_id.slice(0, 8)}</td>
                  <td className="max-w-[200px] truncate text-xs text-silver-500" title={j.error ?? ""}>{j.error ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Reports */}
      <section className={box} aria-labelledby="reports">
        <h2 id="reports" className="text-lg font-semibold">Copyright &amp; content reports <span className="text-silver-500">({openReports.length} open)</span></h2>
        <ul className="mt-4 space-y-3">
          {(reports.data ?? []).map((r) => (
            <li key={r.id} className="rounded-xl border border-silver-300/10 p-4 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-medium capitalize text-white">{r.category} · {r.target}</span>
                <span className="text-xs text-silver-500">{formatDate(r.created_at)} · {r.status}</span>
              </div>
              <p className="mt-2 whitespace-pre-line text-silver-300">{r.details}</p>
              <form action={updateReport} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="id" value={r.id} />
                <select name="status" defaultValue={r.status} className={input} aria-label="Status">
                  <option value="open">Open</option><option value="reviewing">Reviewing</option>
                  <option value="resolved">Resolved</option><option value="rejected">Rejected</option>
                </select>
                <input name="note" defaultValue={r.admin_note ?? ""} placeholder="Internal note" className={`${input} min-w-0 flex-1`} aria-label="Internal note" />
                <SubmitButton pendingText="Saving…" variant="secondary" className="h-10">Save</SubmitButton>
              </form>
            </li>
          ))}
          {!reports.data?.length ? <li className="text-sm text-silver-500">No reports.</li> : null}
        </ul>
      </section>

      {/* Deletions */}
      <section className={box} aria-labelledby="deletions">
        <h2 id="deletions" className="text-lg font-semibold">Account deletion requests</h2>
        <p className="mt-1 text-sm text-silver-400">Handle within 30 days. Deleting removes the account, projects, characters, clips and files permanently. The credit history goes with it.</p>
        <ul className="mt-4 space-y-3">
          {(deletions.data ?? []).map((d) => (
            <li key={d.user_id} className="rounded-xl border border-rose-400/20 p-4 text-sm">
              <p className="text-white">User <span className="font-mono">{d.user_id.slice(0, 8)}</span> · requested {formatDate(d.requested_at)}</p>
              {d.reason ? <p className="mt-1 text-silver-400">&ldquo;{d.reason}&rdquo;</p> : null}
              <div className="mt-3">
                <ConfirmDelete action={completeDeletion} fields={{ userId: d.user_id }} label="Delete account now" confirmText="Permanently delete this account and all its files? This cannot be undone." />
              </div>
            </li>
          ))}
          {!deletions.data?.length ? <li className="text-sm text-silver-500">No pending requests.</li> : null}
        </ul>
      </section>

      {/* Audit */}
      <section className={box} aria-labelledby="audit">
        <h2 id="audit" className="text-lg font-semibold">Audit log</h2>
        <ul className="mt-3 divide-y divide-silver-300/10 text-sm">
          {(audit.data ?? []).map((a) => (
            <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2">
              <span className="text-silver-200">{a.action} · <span className="font-mono text-xs">{(a.target_id ?? "").slice(0, 12)}</span> {a.details && "delta" in a.details ? `(${a.details.delta > 0 ? "+" : ""}${a.details.delta}: ${a.details.note})` : ""}</span>
              <span className="text-xs text-silver-500">{new Date(a.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</span>
            </li>
          ))}
          {!audit.data?.length ? <li className="py-2 text-silver-500">Nothing yet.</li> : null}
        </ul>
      </section>
    </div>
  );
}
