import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { StatusPill } from "@/components/animation/clip-view";
import { PageHeader, PanelSkeleton } from "@/components/dashboard/page-header";
import { CharacterVisual } from "@/components/studio/character-visual";
import { cn } from "@/lib/cn";
import { formatDate, listCharacters, listClips, listProjects, storyboardSummaries } from "@/lib/data";
import { formatDuration } from "@/lib/storyboard/options";

export const metadata: Metadata = { title: "Media Library" };

const TYPES = [
  { id: "all", label: "Everything" },
  { id: "characters", label: "Characters" },
  { id: "videos", label: "Videos" },
  { id: "storyboards", label: "Storyboards" },
] as const;
type TypeId = (typeof TYPES)[number]["id"];

export default function LibraryPage({ searchParams }: PageProps<"/dashboard/library">) {
  return (
    <div className="space-y-8">
      <PageHeader title="Media Library" description="Every character picture, video clip and storyboard you've made, in one place." />
      <Suspense fallback={<PanelSkeleton rows={3} />}>
        <Library searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function mb(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

async function Library({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const type = (TYPES.some((t) => t.id === one(sp.type)) ? one(sp.type) : "all") as TypeId;
  const projects = await listProjects();
  const projectId = projects.some((p) => p.id === one(sp.project)) ? one(sp.project) : undefined;
  const names = new Map(projects.map((p) => [p.id, p.title]));

  const [characters, clips, boards] = await Promise.all([
    type === "all" || type === "characters" ? listCharacters(projectId) : Promise.resolve([]),
    type === "all" || type === "videos" ? listClips({ projectId, limit: 60 }) : Promise.resolve([]),
    type === "all" || type === "storyboards" ? storyboardSummaries() : Promise.resolve(new Map<string, { scenes: number; seconds: number }>()),
  ]);
  const boardList = [...boards.entries()].filter(([pid]) => !projectId || pid === projectId);
  const videoBytes = clips.reduce((t, c) => t + (c.bytes ?? 0), 0);

  const href = (next: { type?: string; project?: string | null }) => {
    const q = new URLSearchParams();
    const t = next.type ?? type;
    const p = next.project === undefined ? projectId : next.project;
    if (t !== "all") q.set("type", t);
    if (p) q.set("project", p);
    const s = q.toString();
    return `/dashboard/library${s ? `?${s}` : ""}`;
  };
  const chip = (active: boolean) =>
    cn(
      "inline-flex h-9 items-center rounded-full border px-3.5 text-sm transition-colors",
      active ? "border-cyan-400/60 bg-cyan-400/5 text-white" : "border-silver-300/15 text-silver-300 hover:border-silver-300/30",
    );
  const empty = !characters.length && !clips.length && !boardList.length;

  return (
    <div className="space-y-8">
      <nav aria-label="Filter" className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <Link key={t.id} href={href({ type: t.id })} className={chip(type === t.id)} aria-current={type === t.id ? "page" : undefined}>
              {t.label}
            </Link>
          ))}
        </div>
        {projects.length > 1 ? (
          <div className="flex flex-wrap gap-2">
            <Link href={href({ project: null })} className={chip(!projectId)}>All projects</Link>
            {projects.map((p) => (
              <Link key={p.id} href={href({ project: p.id })} className={chip(projectId === p.id)}>
                {p.title}
              </Link>
            ))}
          </div>
        ) : null}
      </nav>

      {empty ? (
        <div className="panel px-6 py-14 text-center">
          <p className="text-silver-100">Nothing here yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-silver-500">
            Characters you keep, storyboards you plan and clips you animate all show up here.
          </p>
          <Link href="/dashboard/studio" className="mt-6 inline-flex h-11 items-center rounded-full bg-gradient-to-r from-violet-600 to-violet-500 px-5 text-sm font-medium text-white">
            Create a character
          </Link>
        </div>
      ) : null}

      {characters.length ? (
        <section aria-labelledby="lib-chars">
          <h2 id="lib-chars" className="mb-4 text-lg font-semibold">Characters <span className="text-silver-500">({characters.length})</span></h2>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {characters.map((c) => (
              <li key={c.id}>
                <Link href={`/dashboard/characters/${c.id}`} className="panel block overflow-hidden transition-colors hover:border-cyan-400/40">
                  {c.latest ? (
                    <CharacterVisual
                      imagePath={c.latest.image_path}
                      imageUrl={c.latest.image_url}
                      seed={c.latest.seed}
                      style={c.latest.style}
                      mood={c.latest.mood}
                      aspect={c.latest.aspect_ratio}
                      name={c.name}
                      showBadge={false}
                    />
                  ) : (
                    <div className="aspect-square bg-navy-900" />
                  )}
                  <div className="p-3">
                    <p className="truncate text-sm font-medium text-white">{c.name}</p>
                    <p className="text-xs text-silver-500">
                      {names.get(c.project_id) ?? "Project"} · {c.versionCount} version{c.versionCount === 1 ? "" : "s"} · {formatDate(c.updated_at)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {clips.length ? (
        <section aria-labelledby="lib-videos">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="lib-videos" className="text-lg font-semibold">Videos <span className="text-silver-500">({clips.length})</span></h2>
            {videoBytes ? <span className="text-xs text-silver-500">{mb(videoBytes)} stored</span> : null}
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clips.map((c) => (
              <li key={c.id} className="panel overflow-hidden">
                {c.video_url ? (
                  <video src={c.video_url} controls playsInline preload="metadata" className="aspect-video w-full bg-navy-950 object-contain" aria-label={`Clip version ${c.version}`} />
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-navy-950 p-4 text-center text-xs text-silver-400">
                    {c.is_demo ? "Demo preview (no video)" : c.status === "failed" ? "Not made — credits refunded" : "Animating…"}
                  </div>
                )}
                <div className="space-y-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <StatusPill clip={c} />
                    <span className="text-xs text-silver-500">{formatDate(c.created_at)}</span>
                  </div>
                  <p className="line-clamp-2 text-xs text-silver-400">{c.prompt}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <Link href={`/dashboard/projects/${c.project_id}/animate`} className="text-cyan-300">
                      {names.get(c.project_id) ?? "Project"} · v{c.version} →
                    </Link>
                    {c.download_url ? <a href={c.download_url} className="text-silver-200 hover:text-white">Download</a> : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {boardList.length ? (
        <section aria-labelledby="lib-boards">
          <h2 id="lib-boards" className="mb-4 text-lg font-semibold">Storyboards <span className="text-silver-500">({boardList.length})</span></h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {boardList.map(([pid, s]) => (
              <li key={pid}>
                <Link href={`/dashboard/projects/${pid}/storyboard`} className="panel block p-5 transition-colors hover:border-cyan-400/40">
                  <p className="font-medium text-white">{names.get(pid) ?? "Project"}</p>
                  <p className="mt-1 text-sm text-silver-400">
                    {s.scenes} scene{s.scenes === 1 ? "" : "s"} · {formatDuration(s.seconds)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-xs text-silver-500">
        Everything here is private to your account. Links to files expire after an hour. Delete characters on their page and clips in the animation workspace.
      </p>
    </div>
  );
}
