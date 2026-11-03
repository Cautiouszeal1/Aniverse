import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { randomUUID } from "node:crypto";
import { Suspense } from "react";
import {
  deleteCharacter,
  deleteVersion,
  renameCharacter,
} from "@/app/dashboard/studio/actions";
import { PanelSkeleton } from "@/components/dashboard/page-header";
import { ConfirmDelete } from "@/components/studio/confirm-delete";
import { CharacterVisual } from "@/components/studio/character-visual";
import { getImageProvider } from "@/server/providers/image";
import { pollinationsServerMode } from "@/server/providers/image/pollinations";
import { StudioForm } from "@/components/studio/studio-form";
import { SubmitButton } from "@/components/ui/form";
import { ASPECTS, MOODS, STYLES, labelFor } from "@/lib/characters/options";
import { formatDate, getCharacter, getProject } from "@/lib/data";

export const metadata: Metadata = { title: "Character" };

export default function CharacterPage({ params }: PageProps<"/dashboard/characters/[id]">) {
  return (
    <Suspense fallback={<PanelSkeleton rows={3} />}>
      <CharacterContent params={params} />
    </Suspense>
  );
}

async function CharacterContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const character = await getCharacter(id);
  if (!character) notFound();
  const project = await getProject(character.project_id);
  const [current, ...older] = character.versions;

  return (
    <div className="space-y-10">
      <div>
        <Link href={`/dashboard/projects/${character.project_id}`} className="text-sm text-silver-400 hover:text-white">
          ← {project?.title ?? "Project"}
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div className="panel overflow-hidden">
          {current ? (
            <CharacterVisual imagePath={current.image_path} imageUrl={current.image_url} seed={current.seed} style={current.style} mood={current.mood} aspect={current.aspect_ratio} name={character.name} className="block w-full" />
          ) : null}
        </div>

        <div className="space-y-6">
          <form action={renameCharacter} className="flex items-end gap-2">
            <input type="hidden" name="id" value={character.id} />
            <div className="flex-1">
              <label htmlFor="f-name" className="mb-1 block text-xs text-silver-400">Name</label>
              <input
                id="f-name"
                name="name"
                defaultValue={character.name}
                maxLength={80}
                required
                className="h-12 w-full rounded-xl border border-silver-300/15 bg-navy-950/60 px-3.5 font-display text-xl font-semibold text-white focus:border-cyan-400/70 focus:outline-none"
              />
            </div>
            <SubmitButton pendingText="Saving…" variant="secondary" className="h-12">Rename</SubmitButton>
          </form>

          {current ? (
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div className="col-span-2">
                <dt className="text-silver-500">Description (version {current.version})</dt>
                <dd className="mt-1 text-silver-100">{current.prompt}</dd>
              </div>
              <div><dt className="text-silver-500">Style</dt><dd className="text-silver-100">{labelFor(STYLES, current.style)}</dd></div>
              <div><dt className="text-silver-500">Mood</dt><dd className="text-silver-100">{labelFor(MOODS, current.mood)}</dd></div>
              <div><dt className="text-silver-500">Shape</dt><dd className="text-silver-100">{labelFor(ASPECTS, current.aspect_ratio)}</dd></div>
              <div>
                <dt className="text-silver-500">Made with</dt>
                <dd className="text-silver-100">{current.is_demo ? "Demo placeholder" : `Free AI · ${current.model}`}</dd>
              </div>
            </dl>
          ) : null}

          <p className="rounded-xl border border-silver-300/10 bg-white/[0.02] p-3 text-xs leading-relaxed text-silver-500">
            AI-generated images aren&apos;t automatically protected by copyright, and
            similar images may exist elsewhere. Your saved versions are kept in
            your account.
          </p>

          <ConfirmDelete
            action={deleteCharacter}
            fields={{ id: character.id, projectId: character.project_id }}
            label="Delete character"
            confirmText={`Delete ${character.name} and all ${character.versions.length} version(s)? This can't be undone.`}
          />
        </div>
      </div>

      {older.length ? (
        <section aria-labelledby="history-title">
          <h2 id="history-title" className="mb-4 text-lg font-semibold">Earlier versions</h2>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {older.map((v) => (
              <li key={v.id} className="panel overflow-hidden">
                <CharacterVisual imagePath={v.image_path} imageUrl={v.image_url} seed={v.seed} style={v.style} mood={v.mood} aspect="1:1" name={`${character.name} v${v.version}`} className="block w-full" showBadge={false} />
                <div className="flex items-center justify-between gap-2 p-3">
                  <span className="text-xs text-silver-400">v{v.version} · {formatDate(v.created_at)}</span>
                  <form action={deleteVersion}>
                    <input type="hidden" name="id" value={v.id} />
                    <input type="hidden" name="characterId" value={character.id} />
                    <button type="submit" className="text-xs text-rose-300 hover:text-rose-200" aria-label={`Delete version ${v.version}`}>
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="refine-title" className="space-y-4">
        <div>
          <h2 id="refine-title" className="text-lg font-semibold">Refine this character</h2>
          <p className="text-sm text-silver-400">Adjust the description or style, generate, and save the one you like as a new version.</p>
        </div>
        <StudioForm
          projectId={character.project_id}
          characterId={character.id}
          initialKey={randomUUID()}
          provider={{ isDemo: getImageProvider().isDemo, label: getImageProvider().label, serverMode: pollinationsServerMode() }}
          defaults={current ? { prompt: current.prompt, style: current.style, mood: current.mood, aspect: current.aspect_ratio } : undefined}
        />
      </section>
    </div>
  );
}
