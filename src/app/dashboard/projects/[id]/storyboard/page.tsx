import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { addScene } from "@/app/dashboard/storyboard/actions";
import { PageHeader, PanelSkeleton } from "@/components/dashboard/page-header";
import { SceneCard } from "@/components/storyboard/scene-card";
import { VersionsPanel } from "@/components/storyboard/versions-panel";
import { SubmitButton } from "@/components/ui/form";
import { getProject, getStoryboard, listCharacters } from "@/lib/data";
import { MAX_SCENES, formatDuration } from "@/lib/storyboard/options";

export const metadata: Metadata = { title: "Storyboard" };

export default function StoryboardPage({ params }: PageProps<"/dashboard/projects/[id]/storyboard">) {
  return (
    <Suspense fallback={<PanelSkeleton rows={3} />}>
      <Storyboard params={params} />
    </Suspense>
  );
}

async function Storyboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();
  const [{ board, scenes, revisions }, characters] = await Promise.all([
    getStoryboard(id),
    listCharacters(id),
  ]);
  const total = scenes.reduce((t, s) => t + s.duration_seconds, 0);
  const charList = characters.map((c) => ({ id: c.id, name: c.name }));

  const addButton = (
    <form action={addScene}>
      <input type="hidden" name="projectId" value={id} />
      <SubmitButton pendingText="Adding…" disabled={scenes.length >= MAX_SCENES}>
        + Add scene
      </SubmitButton>
    </form>
  );

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/dashboard/projects/${id}`} className="text-sm text-silver-400 hover:text-white">
          ← {project.title}
        </Link>
        <div className="mt-3">
          <PageHeader
            title="Storyboard"
            description={
              scenes.length
                ? `${scenes.length} scene${scenes.length === 1 ? "" : "s"} · ${formatDuration(total)} total`
                : "Plan your story scene by scene before animating it."
            }
            action={scenes.length ? addButton : undefined}
          />
        </div>
      </div>

      {scenes.length ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <ol className="min-w-0 space-y-4">
            {scenes.map((s, i) => (
              <SceneCard key={s.id} scene={s} index={i} total={scenes.length} characters={charList} />
            ))}
            <li className="flex justify-center pt-2">{addButton}</li>
          </ol>
          <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            {board ? <VersionsPanel storyboardId={board.id} revisions={revisions} /> : null}
            <div className="rounded-2xl border border-silver-300/15 p-5">
              <h2 className="font-semibold text-silver-100">Animate scenes</h2>
              <p className="mt-1 text-sm text-silver-500">Turn each scene into an animated clip with AniVerse AI.</p>
              <Link href={`/dashboard/projects/${id}/animate`} className="mt-3 inline-block text-sm text-cyan-300">
                Open animation workspace →
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="panel px-6 py-14 text-center">
          <p className="text-silver-100">No scenes yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-silver-500">
            Break your story into short scenes: what happens, who is in it, what
            they say, and how the camera sees it.
          </p>
          <div className="mt-6 flex justify-center">{addButton}</div>
        </div>
      )}
    </div>
  );
}
