import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CreateProjectForm } from "@/components/dashboard/forms";
import { PageHeader, PanelSkeleton } from "@/components/dashboard/page-header";
import { clipCounts, listProjects, storyboardSummaries } from "@/lib/data";

export const metadata: Metadata = { title: "Animations" };

export default function AnimationsHome() {
  return (
    <div className="space-y-8">
      <PageHeader title="Animations" description="Turn each storyboard scene into an animated clip, then play your film." />
      <Suspense fallback={<PanelSkeleton rows={2} />}>
        <List />
      </Suspense>
    </div>
  );
}

async function List() {
  const [projects, summaries, counts] = await Promise.all([
    listProjects({ status: "active" }),
    storyboardSummaries(),
    clipCounts(),
  ]);
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
        const scenes = summaries.get(p.id)?.scenes ?? 0;
        const clips = counts.get(p.id) ?? 0;
        return (
          <li key={p.id}>
            <Link href={`/dashboard/projects/${p.id}/animate`} className="panel block p-5 transition-colors hover:border-cyan-400/40">
              <h2 className="font-semibold">{p.title}</h2>
              <p className="mt-1 text-sm text-silver-400">
                {scenes ? `${scenes} scene${scenes === 1 ? "" : "s"}` : "No scenes yet"} · {clips} clip{clips === 1 ? "" : "s"}
              </p>
              <span className="mt-3 inline-block text-sm text-cyan-300">Open animation workspace →</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
