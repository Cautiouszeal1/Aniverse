import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CreateProjectForm } from "@/components/dashboard/forms";
import { PageHeader, PanelSkeleton } from "@/components/dashboard/page-header";
import { listProjects, storyboardSummaries } from "@/lib/data";
import { formatDuration } from "@/lib/storyboard/options";

export const metadata: Metadata = { title: "Storyboards" };

export default function StoryboardsHome() {
  return (
    <div className="space-y-8">
      <PageHeader title="Storyboards" description="Each project has one storyboard. Pick a project to plan its scenes." />
      <Suspense fallback={<PanelSkeleton rows={2} />}>
        <List />
      </Suspense>
    </div>
  );
}

async function List() {
  const [projects, summaries] = await Promise.all([listProjects({ status: "active" }), storyboardSummaries()]);
  if (!projects.length) {
    return (
      <div className="panel max-w-md p-6">
        <p className="mb-4 text-sm text-silver-400">You need a project first.</p>
        <CreateProjectForm compact />
      </div>
    );
  }
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {projects.map((p) => {
        const s = summaries.get(p.id);
        return (
          <li key={p.id}>
            <Link href={`/dashboard/projects/${p.id}/storyboard`} className="panel block p-5 transition-colors hover:border-cyan-400/40">
              <h2 className="font-semibold">{p.title}</h2>
              <p className="mt-1 text-sm text-silver-400">
                {s?.scenes ? `${s.scenes} scene${s.scenes === 1 ? "" : "s"} · ${formatDuration(s.seconds)}` : "No scenes yet"}
              </p>
              <span className="mt-3 inline-block text-sm text-cyan-300">Open storyboard →</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
