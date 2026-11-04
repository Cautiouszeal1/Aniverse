import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader, PanelSkeleton } from "@/components/dashboard/page-header";
import { CharacterCard } from "@/components/studio/character-card";
import { ButtonLink } from "@/components/ui/button";
import { clipCounts, getProject, listCharacters, storyboardSummaries } from "@/lib/data";
import { formatDuration } from "@/lib/storyboard/options";

export default function ProjectPage({ params }: PageProps<"/dashboard/projects/[id]">) {
  return (
    <Suspense fallback={<PanelSkeleton rows={2} />}>
      <ProjectContent params={params} />
    </Suspense>
  );
}

async function ProjectContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();
  const [characters, summaries, counts] = await Promise.all([listCharacters(id), storyboardSummaries(), clipCounts()]);
  const clips = counts.get(id) ?? 0;
  const summary = summaries.get(id);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard/projects" className="text-sm text-silver-400 hover:text-white">
          ← My Projects
        </Link>
        <div className="mt-3">
          <PageHeader
            title={project.title}
            description={project.description ?? "Characters, storyboard and animations for this story."}
            action={<ButtonLink href={`/dashboard/projects/${id}/studio`}>New character</ButtonLink>}
          />
        </div>
      </div>

      <section aria-labelledby="chars-title">
        <h2 id="chars-title" className="mb-4 text-lg font-semibold">
          Characters <span className="text-silver-500">({characters.length})</span>
        </h2>
        {characters.length ? (
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {characters.map((c) => (
              <li key={c.id}>
                <CharacterCard c={c} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="panel px-6 py-12 text-center">
            <p className="text-silver-100">No characters yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-silver-500">
              Every story starts with someone. Describe your first character and
              pick the look you like.
            </p>
            <ButtonLink href={`/dashboard/projects/${id}/studio`} className="mt-5">
              Open Character Studio
            </ButtonLink>
          </div>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href={`/dashboard/projects/${id}/storyboard`}
          className="panel block p-5 transition-colors hover:border-cyan-400/40"
        >
          <h3 className="font-semibold">Storyboard</h3>
          <p className="mt-1 text-sm text-silver-400">
            {summary?.scenes
              ? `${summary.scenes} scene${summary.scenes === 1 ? "" : "s"} · ${formatDuration(summary.seconds)}`
              : "Plan your story scene by scene."}
          </p>
          <span className="mt-3 inline-block text-sm text-cyan-300">Open storyboard →</span>
        </Link>
        <Link
          href={`/dashboard/projects/${id}/animate`}
          className="panel block p-5 transition-colors hover:border-cyan-400/40"
        >
          <h3 className="font-semibold">Animations</h3>
          <p className="mt-1 text-sm text-silver-400">
            {clips ? `${clips} clip${clips === 1 ? "" : "s"}` : "Turn your scenes into animated clips."}
          </p>
          <span className="mt-3 inline-block text-sm text-cyan-300">Open animation workspace →</span>
        </Link>
      </section>
    </div>
  );
}
