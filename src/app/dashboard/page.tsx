import Link from "next/link";
import { Suspense } from "react";
import { CreateProjectForm, OnboardingForm } from "@/components/dashboard/forms";
import { PageHeader, PanelSkeleton } from "@/components/dashboard/page-header";
import { getCreditBalance, getCurrentUser } from "@/lib/auth";
import { countProjects, formatDate, listProjects } from "@/lib/data";

export default function OverviewPage() {
  return (
    <Suspense fallback={<PanelSkeleton rows={3} />}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  const [user, recent, activeCount, balance] = await Promise.all([
    getCurrentUser(),
    listProjects({ status: "active", limit: 5 }),
    countProjects(),
    getCreditBalance(),
  ]);
  const name = user.displayName?.split(" ")[0];

  return (
    <div className="space-y-8">
      <PageHeader
        title={name ? `Welcome, ${name}` : "Welcome"}
        description="Your studio at a glance."
      />

      {!user.onboarded ? <OnboardingForm displayName={user.displayName} /> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Active projects" value={activeCount.toLocaleString("en-US")} href="/dashboard/projects" />
        <Stat label="Credit balance" value={balance.toLocaleString("en-US")} href="/dashboard/credits" />
        <Stat label="Animations generated" value="0" note="Animation arrives in Milestone 5" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="recent-title" className="panel p-6">
          <div className="flex items-center justify-between">
            <h2 id="recent-title" className="text-lg font-semibold">Recent projects</h2>
            {recent.length ? (
              <Link href="/dashboard/projects" className="text-sm text-cyan-300 hover:text-cyan-200">
                View all
              </Link>
            ) : null}
          </div>
          {recent.length ? (
            <ul className="mt-4 divide-y divide-silver-300/10">
              {recent.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4 py-3">
                  <Link href={`/dashboard/projects/${p.id}`} className="truncate text-silver-100 hover:text-cyan-200">
                    {p.title}
                  </Link>
                  <span className="shrink-0 text-xs text-silver-500">Updated {formatDate(p.updated_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-silver-300/15 px-5 py-10 text-center">
              <p className="text-silver-200">No projects yet</p>
              <p className="mt-1 text-sm text-silver-500">
                A project holds your characters, storyboard and animations for one story.
              </p>
            </div>
          )}
        </section>

        <section aria-labelledby="new-title" className="panel p-6">
          <h2 id="new-title" className="text-lg font-semibold">Start a new project</h2>
          <div className="mt-4">
            <CreateProjectForm compact />
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, href, note }: { label: string; value: string; href?: string; note?: string }) {
  const body = (
    <>
      <p className="text-sm text-silver-400">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-white">{value}</p>
      {note ? <p className="mt-1 text-xs text-silver-500">{note}</p> : null}
    </>
  );
  return href ? (
    <Link href={href} className="panel block p-5 transition-colors hover:border-cyan-400/30">
      {body}
    </Link>
  ) : (
    <div className="panel p-5">{body}</div>
  );
}
