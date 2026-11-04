import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AutoRefresh } from "@/components/animation/auto-refresh";
import { ClipGenerator } from "@/components/animation/clip-generator";
import { Collapsible } from "@/components/animation/collapsible";
import { ClipActions, ClipScreen, StatusPill } from "@/components/animation/clip-view";
import { FilmPlayer } from "@/components/animation/film-player";
import { PageHeader, PanelSkeleton } from "@/components/dashboard/page-header";
import { getCreditBalance } from "@/lib/auth";
import { type Clip, formatDate, getProject, getStoryboard, listClips, listPrices, videoServicePaused } from "@/lib/data";
import { formatDuration } from "@/lib/storyboard/options";
import { videoMode } from "@/server/providers/video";

export const metadata: Metadata = { title: "Animate" };
// Clips render in the background after the request; give them time to finish.
export const maxDuration = 300;

export default function AnimatePage({ params }: PageProps<"/dashboard/projects/[id]/animate">) {
  return (
    <Suspense fallback={<PanelSkeleton rows={3} />}>
      <Workspace params={params} />
    </Suspense>
  );
}

async function Workspace({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();
  const [{ scenes }, clips, prices, balance, paused] = await Promise.all([
    getStoryboard(id),
    listClips({ projectId: id }),
    listPrices(),
    getCreditBalance(),
    videoServicePaused(),
  ]);
  const demo = videoMode() === "demo";
  const priceOptions = prices
    .filter((p) => p.enabled)
    .map((p) => ({ id: p.id, label: p.label, description: p.description, credits: p.credits_per_clip, maxSeconds: p.max_seconds }));

  const byScene = new Map<string, Clip[]>();
  for (const c of clips) {
    if (!c.scene_id) continue;
    byScene.set(c.scene_id, [...(byScene.get(c.scene_id) ?? []), c]);
  }
  const anyBusy = clips.some((c) => c.status === "processing" || c.status === "queued");
  const film = scenes.flatMap((s, i) => {
    const ready = (byScene.get(s.id) ?? []).find((c) => c.video_url);
    return ready?.video_url ? [{ url: ready.video_url, title: s.title || `Scene ${i + 1}` }] : [];
  });
  const total = scenes.reduce((t, s) => t + s.duration_seconds, 0);

  return (
    <div className="space-y-8">
      <AutoRefresh active={anyBusy} />
      <div>
        <Link href={`/dashboard/projects/${id}`} className="text-sm text-silver-400 hover:text-white">
          ← {project.title}
        </Link>
        <div className="mt-3">
          <PageHeader
            title="Animation"
            description={
              scenes.length
                ? `${scenes.length} scene${scenes.length === 1 ? "" : "s"} · ${formatDuration(total)} planned · ${clips.length} clip${clips.length === 1 ? "" : "s"}`
                : "Add scenes to your storyboard, then animate them here."
            }
          />
        </div>
      </div>

      {demo ? (
        <p className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-100">
          Demo mode: the video engine isn&apos;t connected on this server, so you&apos;ll get labelled previews — not AI video — and nothing is charged.
        </p>
      ) : paused ? (
        <p role="status" className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-100">
          AniVerse AI animation is briefly unavailable. Nobody is charged while it&apos;s paused.
        </p>
      ) : null}

      {!scenes.length ? (
        <div className="panel px-6 py-14 text-center">
          <p className="text-silver-100">No scenes to animate yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-silver-500">Plan your story scene by scene first.</p>
          <Link href={`/dashboard/projects/${id}/storyboard`} className="mt-6 inline-flex h-11 items-center rounded-full bg-gradient-to-r from-violet-600 to-violet-500 px-5 text-sm font-medium text-white">
            Open storyboard
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <ol className="min-w-0 space-y-6" aria-label="Scene timeline">
            {scenes.map((s, i) => {
              const versions = byScene.get(s.id) ?? [];
              const latest = versions[0];
              const busy = versions.some((c) => c.status === "processing" || c.status === "queued");
              const title = s.title || `Scene ${i + 1}`;
              return (
                <li key={s.id} className="panel p-5 sm:p-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-lg font-semibold">
                      <span className="mr-2 text-silver-500">{i + 1}.</span>
                      {title}
                    </h2>
                    <span className="text-xs text-silver-500">
                      {formatDuration(s.duration_seconds)} planned · {versions.length} version{versions.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  {s.description ? <p className="mt-1 line-clamp-2 text-sm text-silver-400">{s.description}</p> : null}

                  {latest ? (
                    <div className="mt-4 space-y-3">
                      <ClipScreen clip={latest} title={title} />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs text-silver-500">
                          <StatusPill clip={latest} />
                          <span>v{latest.version} · {latest.duration_seconds}s · {formatDate(latest.created_at)}</span>
                        </div>
                        <ClipActions clip={latest} />
                      </div>
                    </div>
                  ) : null}

                  <Collapsible
                    className="mt-5 rounded-xl border border-silver-300/10 p-4"
                    initiallyOpen={!latest}
                    summaryClassName="cursor-pointer text-sm font-medium text-cyan-200"
                    summary={latest ? "Make a new version" : "Animate this scene"}
                  >
                    <div className="mt-4">
                      <ClipGenerator
                        projectId={id}
                        sceneId={s.id}
                        sceneSeconds={s.duration_seconds}
                        prices={priceOptions}
                        balance={balance}
                        demo={demo}
                        paused={paused && !demo}
                        busy={busy}
                      />
                    </div>
                  </Collapsible>

                  {versions.length > 1 ? (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm text-silver-400">Version history ({versions.length})</summary>
                      <ul className="mt-3 grid gap-4 sm:grid-cols-2">
                        {versions.slice(1).map((v) => (
                          <li key={v.id} className="space-y-2">
                            <ClipScreen clip={v} title={`${title} v${v.version}`} />
                            <div className="flex flex-wrap items-center gap-2 text-xs text-silver-500">
                              <StatusPill clip={v} />
                              <span>v{v.version} · {formatDate(v.created_at)}</span>
                            </div>
                            <ClipActions clip={v} />
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </li>
              );
            })}
          </ol>

          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <section className="panel p-5" aria-labelledby="film-title">
              <h2 id="film-title" className="font-semibold">Your film</h2>
              <p className="mb-4 mt-1 text-xs text-silver-500">Latest ready clip of each scene, in story order.</p>
              <FilmPlayer clips={film} />
            </section>
            <section className="panel p-5 text-sm text-silver-400" aria-labelledby="export-title">
              <h2 id="export-title" className="font-semibold text-white">Export</h2>
              <p className="mt-1">
                Every clip downloads as an MP4 video — use <em>Download MP4</em> on each scene. Joining all scenes into a single film file is coming next.
              </p>
              <p className="mt-3">
                Credits: <span className="text-white">{balance}</span> ·{" "}
                <Link href="/dashboard/credits" className="text-cyan-300">Top up</Link>
              </p>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
