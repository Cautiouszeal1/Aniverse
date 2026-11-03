"use client";

import { useActionState } from "react";
import { deleteVersion, restoreVersion, saveVersion } from "@/app/dashboard/storyboard/actions";
import { ConfirmDelete } from "@/components/studio/confirm-delete";
import { Alert, SubmitButton } from "@/components/ui/form";
import type { StoryboardRevision } from "@/lib/data";
import type { FormState } from "@/lib/validation";

export function VersionsPanel({
  storyboardId,
  revisions,
}: {
  storyboardId: string;
  revisions: StoryboardRevision[];
}) {
  const [state, action] = useActionState(saveVersion, {} as FormState);
  return (
    <section aria-labelledby="versions-title" className="panel p-5">
      <h2 id="versions-title" className="font-semibold">Saved versions</h2>
      <p className="mt-1 text-xs text-silver-500">
        Save a snapshot before big changes. Restoring replaces the current scenes.
      </p>
      <form action={action} className="mt-4 flex gap-2">
        <input type="hidden" name="storyboardId" value={storyboardId} />
        <label htmlFor="f-version-label" className="sr-only">Version name</label>
        <input
          id="f-version-label"
          name="label"
          maxLength={80}
          placeholder="e.g. First draft"
          className="h-10 min-w-0 flex-1 rounded-xl border border-silver-300/15 bg-navy-950/60 px-3 text-sm text-white placeholder:text-silver-500 focus:border-cyan-400/70 focus:outline-none"
        />
        <SubmitButton pendingText="Saving…" variant="secondary" className="h-10">Save version</SubmitButton>
      </form>
      <div className="mt-3">
        {state.error ? <Alert tone="error">{state.error}</Alert> : null}
        {state.ok ? <Alert tone="success">{state.message}</Alert> : null}
      </div>
      {revisions.length ? (
        <ul className="mt-3 divide-y divide-silver-300/10">
          {revisions.map((r) => (
            <li key={r.id} className="py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-sm text-silver-100">{r.label}</span>
                <span className="shrink-0 text-xs text-silver-500">
                  {r.scene_count} scene{r.scene_count === 1 ? "" : "s"}
                </span>
              </div>
              <p className="text-xs text-silver-500">
                {new Date(r.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <ConfirmDelete
                  action={restoreVersion}
                  fields={{ id: r.id }}
                  label="Restore"
                  confirmLabel="Yes, restore"
                  tone="neutral"
                  confirmText={`Replace the current scenes with “${r.label}”? Save a version first if you want to keep what you have now.`}
                />
                <form action={deleteVersion}>
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" className="rounded-full px-3 py-2 text-xs text-silver-400 hover:text-rose-200">
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-silver-500">No saved versions yet.</p>
      )}
    </section>
  );
}
