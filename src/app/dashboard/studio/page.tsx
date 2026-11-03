import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CreateProjectForm } from "@/components/dashboard/forms";
import { PageHeader, PanelSkeleton } from "@/components/dashboard/page-header";
import { CharacterCard } from "@/components/studio/character-card";
import { listCharacters, listProjects } from "@/lib/data";

export const metadata: Metadata = { title: "Character Studio" };

export default function StudioHome() {
  return (
    <div className="space-y-8">
      <PageHeader title="Character Studio" description="Characters live inside a project. Pick a project to start creating." />
      <Suspense fallback={<PanelSkeleton rows={2} />}>
        <StudioHomeContent />
      </Suspense>
    </div>
  );
}

async function StudioHomeContent() {
  const [projects, characters] = await Promise.all([
    listProjects({ status: "active" }),
    listCharacters(),
  ]);
  return (
    <>
      <section aria-labelledby="pick-title" className="panel p-6">
        <h2 id="pick-title" className="text-lg font-semibold">Choose a project</h2>
        {projects.length ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/dashboard/projects/${p.id}/studio`}
                  className="flex items-center justify-between rounded-xl border border-silver-300/15 px-4 py-3 text-silver-100 hover:border-cyan-400/50"
                >
                  <span className="truncate">{p.title}</span>
                  <span className="text-sm text-cyan-300">Create →</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 max-w-md">
            <p className="mb-4 text-sm text-silver-400">You need a project first.</p>
            <CreateProjectForm compact />
          </div>
        )}
      </section>

      {characters.length ? (
        <section aria-labelledby="all-title">
          <h2 id="all-title" className="mb-4 text-lg font-semibold">All your characters</h2>
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {characters.map((c) => (
              <li key={c.id}><CharacterCard c={c} /></li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
