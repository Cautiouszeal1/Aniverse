"use client";

import { useActionState, useState } from "react";
import {
  deleteScene,
  duplicateScene,
  moveScene,
  updateScene,
} from "@/app/dashboard/storyboard/actions";
import { ConfirmDelete } from "@/components/studio/confirm-delete";
import { Alert } from "@/components/ui/form";
import { cn } from "@/lib/cn";
import type { Scene } from "@/lib/data";
import { SHOT_TYPES } from "@/lib/storyboard/options";
import type { FormState } from "@/lib/validation";

const inputCls =
  "w-full rounded-xl border border-silver-300/15 bg-navy-950/60 px-3 py-2 text-sm text-white placeholder:text-silver-500 focus:border-cyan-400/70 focus:outline-none focus:ring-2 focus:ring-cyan-400/20";

function IconButton({
  label,
  children,
  disabled,
}: {
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      aria-label={label}
      title={label}
      disabled={disabled}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-silver-300/15 text-silver-300 hover:border-cyan-400/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}

export function SceneCard({
  scene,
  index,
  total,
  characters,
}: {
  scene: Scene;
  index: number;
  total: number;
  characters: { id: string; name: string }[];
}) {
  const [dirty, setDirty] = useState(false);
  const [state, action] = useActionState(async (prev: FormState, form: FormData) => {
    const result = await updateScene(prev, form);
    if (result.ok) setDirty(false);
    return result;
  }, {} as FormState);
  const f = `scene-${scene.id}`;

  return (
    <li className="panel p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/40 to-cyan-400/20 font-display text-sm font-semibold text-white">
            {index + 1}
          </span>
          <span className="text-sm text-silver-400">{scene.duration_seconds}s</span>
          {dirty ? <span className="text-xs text-amber-300">Unsaved changes</span> : null}
          {!dirty && state.ok ? <span className="text-xs text-emerald-300" role="status">Saved</span> : null}
        </div>
        <div className="flex items-center gap-1.5">
          <form action={moveScene}>
            <input type="hidden" name="id" value={scene.id} />
            <input type="hidden" name="dir" value="up" />
            <IconButton label={`Move scene ${index + 1} up`} disabled={index === 0}>
              <path d="M12 19V5M6 11l6-6 6 6" />
            </IconButton>
          </form>
          <form action={moveScene}>
            <input type="hidden" name="id" value={scene.id} />
            <input type="hidden" name="dir" value="down" />
            <IconButton label={`Move scene ${index + 1} down`} disabled={index === total - 1}>
              <path d="M12 5v14M6 13l6 6 6-6" />
            </IconButton>
          </form>
          <form action={duplicateScene}>
            <input type="hidden" name="id" value={scene.id} />
            <IconButton label={`Duplicate scene ${index + 1}`}>
              <rect x="8" y="8" width="12" height="12" rx="2" />
              <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
            </IconButton>
          </form>
        </div>
      </div>

      <form id={f} action={action} onChange={() => setDirty(true)} className="grid gap-4 md:grid-cols-2">
        <input type="hidden" name="id" value={scene.id} />
        <div className="md:col-span-2">
          <label htmlFor={`${f}-title`} className="mb-1 block text-xs font-medium text-silver-300">Scene title</label>
          <input id={`${f}-title`} name="title" defaultValue={scene.title} maxLength={120} className={cn(inputCls, "font-display text-base font-semibold")} />
          {state.fieldErrors?.title ? <p className="mt-1 text-xs text-rose-300">{state.fieldErrors.title}</p> : null}
        </div>
        <div>
          <label htmlFor={`${f}-desc`} className="mb-1 block text-xs font-medium text-silver-300">What happens</label>
          <textarea id={`${f}-desc`} name="description" defaultValue={scene.description} rows={4} maxLength={2000} placeholder="Action, setting, emotion…" className={inputCls} />
          {state.fieldErrors?.description ? <p className="mt-1 text-xs text-rose-300">{state.fieldErrors.description}</p> : null}
        </div>
        <div>
          <label htmlFor={`${f}-dlg`} className="mb-1 block text-xs font-medium text-silver-300">Dialogue</label>
          <textarea id={`${f}-dlg`} name="dialogue" defaultValue={scene.dialogue} rows={4} maxLength={2000} placeholder={'ADA: "The light must never go out."'} className={inputCls} />
          {state.fieldErrors?.dialogue ? <p className="mt-1 text-xs text-rose-300">{state.fieldErrors.dialogue}</p> : null}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor={`${f}-shot`} className="mb-1 block text-xs font-medium text-silver-300">Shot</label>
            <select id={`${f}-shot`} name="shotType" defaultValue={scene.shot_type} className={cn(inputCls, "h-10")}>
              {SHOT_TYPES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${f}-dur`} className="mb-1 block text-xs font-medium text-silver-300">Duration (seconds)</label>
            <input id={`${f}-dur`} name="duration" type="number" min={0.5} max={120} step={0.5} defaultValue={scene.duration_seconds} className={cn(inputCls, "h-10")} />
            {state.fieldErrors?.duration ? <p className="mt-1 text-xs text-rose-300">{state.fieldErrors.duration}</p> : null}
          </div>
        </div>
        <div>
          <label htmlFor={`${f}-cam`} className="mb-1 block text-xs font-medium text-silver-300">Camera notes</label>
          <input id={`${f}-cam`} name="cameraNotes" defaultValue={scene.camera_notes} maxLength={500} placeholder="Slow push in, low angle…" className={cn(inputCls, "h-10")} />
        </div>

        <fieldset className="md:col-span-2">
          <legend className="mb-2 text-xs font-medium text-silver-300">Characters in this scene</legend>
          {characters.length ? (
            <div className="flex flex-wrap gap-2">
              {characters.map((c) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-full border border-silver-300/15 px-3 py-1.5 text-sm text-silver-200 has-[:checked]:border-cyan-400/60 has-[:checked]:bg-cyan-400/15 has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-cyan-400/50">
                  <input type="checkbox" name="characterIds" value={c.id} defaultChecked={scene.character_ids.includes(c.id)} className="sr-only" />
                  {c.name}
                </label>
              ))}
            </div>
          ) : (
            <p className="text-xs text-silver-500">Create characters in Character Studio to add them to scenes.</p>
          )}
        </fieldset>

        {state.error ? (
          <div className="md:col-span-2">
            <Alert tone="error">{state.error}</Alert>
          </div>
        ) : null}
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t hairline pt-4">
        <ConfirmDelete
          action={deleteScene}
          fields={{ id: scene.id }}
          label="Delete scene"
          confirmText={`Delete “${scene.title || `Scene ${index + 1}`}”? This can't be undone (unless you saved a version).`}
        />
        <SaveButton formId={f} dirty={dirty} />
      </div>
    </li>
  );
}

function SaveButton({ formId, dirty }: { formId: string; dirty: boolean }) {
  return (
    <button
      type="submit"
      form={formId}
      className={cn(
        "inline-flex h-10 items-center rounded-full px-5 text-sm font-medium transition-colors",
        dirty
          ? "bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-500 hover:to-violet-400"
          : "border border-silver-300/20 text-silver-200 hover:border-cyan-400/50",
      )}
    >
      Save scene
    </button>
  );
}

