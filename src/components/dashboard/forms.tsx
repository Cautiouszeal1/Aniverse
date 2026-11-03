"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createProject,
  deleteProject,
  renameProject,
  saveProfile,
  setProjectStatus,
  skipOnboarding,
} from "@/app/dashboard/actions";
import { Alert, Field, SubmitButton } from "@/components/ui/form";
import type { FormState } from "@/lib/validation";

const initial: FormState = {};

export const CREATOR_OPTIONS = [
  { value: "beginner", label: "Just starting out" },
  { value: "content_creator", label: "Content creator" },
  { value: "independent_animator", label: "Independent animator" },
  { value: "studio", label: "Small studio or team" },
  { value: "other", label: "Something else" },
];

function CreatorSelect({ defaultValue }: { defaultValue?: string | null }) {
  return (
    <div>
      <label htmlFor="f-creatorType" className="mb-1.5 block text-sm font-medium text-silver-100">
        What best describes you? <span className="text-silver-500">(optional)</span>
      </label>
      <select
        id="f-creatorType"
        name="creatorType"
        defaultValue={defaultValue ?? ""}
        className="h-11 w-full rounded-xl border border-silver-300/15 bg-navy-950/60 px-3 text-[0.95rem] text-white focus:border-cyan-400/70 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
      >
        <option value="">Prefer not to say</option>
        {CREATOR_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function OnboardingForm({ displayName }: { displayName: string | null }) {
  const [state, action] = useActionState(saveProfile, initial);
  return (
    <div className="panel relative overflow-hidden p-6 sm:p-8">
      <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-violet-600/25 blur-3xl" />
      <div className="relative">
        <h2 className="text-xl font-semibold">Welcome to Ani Studio</h2>
        <p className="mt-2 max-w-xl text-sm text-silver-400">
          Two quick questions so we can shape the studio around you. You can
          skip this and change it later in Settings.
        </p>
        <form action={action} className="mt-6 grid gap-5 sm:grid-cols-2">
          <input type="hidden" name="onboarding" value="1" />
          <Field label="Display name" name="displayName" maxLength={60} defaultValue={displayName ?? ""} />
          <CreatorSelect />
          {state.error ? (
            <div className="sm:col-span-2">
              <Alert tone="error">{state.error}</Alert>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <SubmitButton pendingText="Saving…">Continue</SubmitButton>
            <button
              type="submit"
              formAction={skipOnboarding}
              className="inline-flex h-11 items-center rounded-full px-5 text-sm text-silver-300 hover:bg-white/[0.05] hover:text-white"
            >
              Skip for now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ProfileForm({
  displayName,
  creatorType,
}: {
  displayName: string | null;
  creatorType: string | null;
}) {
  const [state, action] = useActionState(saveProfile, initial);
  return (
    <form action={action} className="space-y-5">
      {state.ok ? <Alert tone="success">{state.message}</Alert> : null}
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      <Field label="Display name" name="displayName" maxLength={60} defaultValue={displayName ?? ""} />
      <CreatorSelect defaultValue={creatorType} />
      <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
    </form>
  );
}

export function CreateProjectForm({ compact = false }: { compact?: boolean }) {
  const [state, action] = useActionState(createProject, initial);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={action} className="space-y-4" noValidate>
      {state.ok ? <Alert tone="success">{state.message}</Alert> : null}
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      <Field
        label="Project name"
        name="title"
        required
        maxLength={120}
        placeholder="e.g. The Lantern Keeper"
        defaultValue={state.ok ? "" : state.values?.title}
        error={state.fieldErrors?.title}
      />
      {compact ? null : (
        <div>
          <label htmlFor="f-description" className="mb-1.5 block text-sm font-medium text-silver-100">
            Short description <span className="text-silver-500">(optional)</span>
          </label>
          <textarea
            id="f-description"
            name="description"
            rows={3}
            maxLength={2000}
            defaultValue={state.ok ? "" : state.values?.description}
            className="w-full rounded-xl border border-silver-300/15 bg-navy-950/60 px-3.5 py-2.5 text-[0.95rem] text-white placeholder:text-silver-500 focus:border-cyan-400/70 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
            placeholder="What's the story about?"
          />
          {state.fieldErrors?.description ? (
            <p className="mt-1.5 text-sm text-rose-300">{state.fieldErrors.description}</p>
          ) : null}
        </div>
      )}
      <SubmitButton pendingText="Creating…">Create project</SubmitButton>
    </form>
  );
}

export function ProjectActions({
  id,
  title,
  status,
}: {
  id: string;
  title: string;
  status: "active" | "archived";
}) {
  const [mode, setMode] = useState<"idle" | "rename" | "delete">("idle");
  const [confirmText, setConfirmText] = useState("");
  const [renameState, renameAction] = useActionState(
    async (prev: FormState, form: FormData) => {
      const result = await renameProject(prev, form);
      if (result.ok) setMode("idle");
      return result;
    },
    initial,
  );

  if (mode === "rename") {
    return (
      <form action={renameAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <input type="hidden" name="id" value={id} />
        <Field
          label="New name"
          name="title"
          defaultValue={title}
          maxLength={120}
          className="flex-1"
          error={renameState.fieldErrors?.title ?? renameState.error}
          autoFocus
        />
        <div className="flex gap-2">
          <SubmitButton pendingText="Saving…">Save</SubmitButton>
          <button type="button" onClick={() => setMode("idle")} className="h-11 rounded-full px-4 text-sm text-silver-300 hover:bg-white/[0.05]">
            Cancel
          </button>
        </div>
      </form>
    );
  }

  if (mode === "delete") {
    return (
      <form action={deleteProject} className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/5 p-4">
        <input type="hidden" name="id" value={id} />
        <p className="text-sm text-rose-100">
          This permanently deletes <strong>{title}</strong>. Type the project
          name to confirm.
        </p>
        <input
          name="confirmTitle"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          aria-label="Type the project name to confirm"
          className="mt-3 h-10 w-full rounded-lg border border-rose-400/30 bg-navy-950/60 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-400/30"
          autoFocus
        />
        <div className="mt-3 flex gap-2">
          <SubmitButton pendingText="Deleting…" variant="danger" disabled={confirmText !== title}>
            Delete forever
          </SubmitButton>
          <button type="button" onClick={() => { setMode("idle"); setConfirmText(""); }} className="h-11 rounded-full px-4 text-sm text-silver-300 hover:bg-white/[0.05]">
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2 text-sm">
      <button type="button" onClick={() => setMode("rename")} className="rounded-full border border-silver-300/15 px-3 py-1.5 text-silver-200 hover:border-cyan-400/50">
        Rename
      </button>
      <form action={setProjectStatus}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="status" value={status === "active" ? "archived" : "active"} />
        <button type="submit" className="rounded-full border border-silver-300/15 px-3 py-1.5 text-silver-200 hover:border-cyan-400/50">
          {status === "active" ? "Archive" : "Restore"}
        </button>
      </form>
      <button type="button" onClick={() => setMode("delete")} className="rounded-full border border-rose-400/25 px-3 py-1.5 text-rose-200 hover:bg-rose-500/10">
        Delete
      </button>
    </div>
  );
}
