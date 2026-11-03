"use client";

import { useActionState, useEffect, useState } from "react";
import {
  addCharacterVersion,
  generateCharacter,
  saveNewCharacter,
  type GenerateState,
} from "@/app/dashboard/studio/actions";
import { Alert, SubmitButton } from "@/components/ui/form";
import {
  ASPECTS,
  MOODS,
  PROMPT_EXAMPLES,
  STYLES,
  VARIATIONS_PER_GENERATION,
} from "@/lib/characters/options";
import { cn } from "@/lib/cn";
import { AiImage } from "./ai-image";
import { DemoArt } from "./demo-art";

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function Chips({
  name,
  options,
  value,
  onChange,
  legend,
}: {
  name: string;
  options: readonly { id: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  legend: string;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-silver-100">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.id}
            className={cn(
              "cursor-pointer rounded-full border px-3.5 py-1.5 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-cyan-400/50",
              value === o.id
                ? "border-cyan-400/60 bg-cyan-400/15 text-white"
                : "border-silver-300/15 text-silver-300 hover:border-silver-300/35",
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.id}
              checked={value === o.id}
              onChange={() => onChange(o.id)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function StudioForm({
  projectId,
  characterId,
  defaults,
  suggestedName,
  initialKey,
  provider,
}: {
  projectId: string;
  /** When set, results are saved as new versions of this character. */
  characterId?: string;
  defaults?: { prompt: string; style: string; mood: string; aspect: string };
  suggestedName?: string;
  /** Server-generated so the first render matches between server and browser. */
  initialKey: string;
  /** Which image engine is active (decided on the server). */
  provider: { isDemo: boolean; label: string };
}) {
  const [requestKey, setRequestKey] = useState(initialKey);
  const [state, action] = useActionState(async (prev: GenerateState, form: FormData) => {
    const result = await generateCharacter(prev, form);
    if (result.job) setRequestKey(newKey()); // next click is a new generation
    return result;
  }, {} as GenerateState);

  const [prompt, setPrompt] = useState(defaults?.prompt ?? "");
  const [style, setStyle] = useState(defaults?.style ?? STYLES[0].id);
  const [mood, setMood] = useState(defaults?.mood ?? MOODS[0].id);
  const [aspect, setAspect] = useState(defaults?.aspect ?? "1:1");
  const [name, setName] = useState(suggestedName ?? "");

  const job = state.job;
  // Free tier: load AI images one after another to respect its rate limit.
  const [loadedUpTo, setLoadedUpTo] = useState<{ jobId: string; n: number }>({ jobId: "", n: 0 });
  const activeIndex = job && loadedUpTo.jobId === job.id ? loadedUpTo.n : 0;
  const jobId = job?.id;
  useEffect(() => {
    if (!jobId) return;
    document.getElementById(`results-${jobId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [jobId]);
  const advance = (jobId: string, i: number) =>
    setLoadedUpTo((cur) => (cur.jobId === jobId && cur.n > i ? cur : { jobId, n: i + 1 }));

  return (
    <div className="space-y-8">
      <form action={action} className="panel space-y-6 p-6">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="requestKey" value={requestKey} />

        <div>
          <label htmlFor="f-prompt" className="mb-1.5 block text-sm font-medium text-silver-100">
            Describe your character
          </label>
          <textarea
            id="f-prompt"
            name="prompt"
            rows={4}
            maxLength={1000}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            aria-invalid={state.fieldErrors?.prompt ? true : undefined}
            placeholder="Who are they? What do they look like, wear or carry?"
            className="w-full rounded-xl border border-silver-300/15 bg-navy-950/60 px-3.5 py-3 text-[0.95rem] leading-relaxed text-white placeholder:text-silver-500 focus:border-cyan-400/70 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
          />
          <div className="mt-1.5 flex items-start justify-between gap-4">
            {state.fieldErrors?.prompt ? (
              <p className="text-sm text-rose-300">{state.fieldErrors.prompt}</p>
            ) : (
              <span />
            )}
            <span className="shrink-0 text-xs text-silver-500">{prompt.length}/1000</span>
          </div>
          {!prompt ? (
            <div className="mt-3">
              <p className="mb-2 text-xs uppercase tracking-wider text-silver-500">Try an example</p>
              <div className="flex flex-wrap gap-2">
                {PROMPT_EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setPrompt(ex)}
                    className="rounded-xl border border-silver-300/10 bg-white/[0.03] px-3 py-2 text-left text-xs text-silver-300 hover:border-cyan-400/40 hover:text-white"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <Chips name="style" legend="Style" options={STYLES} value={style} onChange={setStyle} />
        <Chips name="mood" legend="Mood" options={MOODS} value={mood} onChange={setMood} />
        <Chips name="aspect" legend="Shape" options={ASPECTS} value={aspect} onChange={setAspect} />

        {state.error ? <Alert tone="error">{state.error}</Alert> : null}

        <div className="flex flex-col gap-3 border-t hairline pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-silver-400">
            <span
              className={cn(
                "mr-2 rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wider",
                provider.isDemo
                  ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
                  : "border-cyan-400/40 bg-cyan-400/10 text-cyan-200",
              )}
            >
              {provider.isDemo ? "Demo mode" : provider.label}
            </span>
            {VARIATIONS_PER_GENERATION} variations · <strong className="text-white">0 credits</strong>.{" "}
            {provider.isDemo
              ? "Images are placeholders until AI is connected."
              : "Images appear one by one (about 15 seconds each)."}
          </p>
          <SubmitButton pendingText="Generating…" className="sm:min-w-44">
            {job ? "Generate again" : "Generate"}
          </SubmitButton>
        </div>
      </form>

      {job ? (
        <section id={`results-${job.id}`} aria-labelledby="results-title" className="scroll-mt-24 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="results-title" className="text-lg font-semibold">
                Pick your favourite
              </h2>
              <p className="text-sm text-silver-400">
                {job.isDemo
                  ? "Demo placeholders — the real AI will draw your description here."
                  : `Painting ${Math.min(activeIndex + 1, job.images.length)} of ${job.images.length}… Made with free AI (${job.model}). You can keep one as soon as it appears.`}
              </p>
            </div>
            {!characterId ? (
              <div className="sm:w-72">
                <label htmlFor="f-charname" className="mb-1 block text-xs text-silver-400">
                  Character name
                </label>
                <input
                  id="f-charname"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  placeholder="e.g. Ada the Lantern Keeper"
                  className="h-10 w-full rounded-xl border border-silver-300/15 bg-navy-950/60 px-3 text-sm text-white placeholder:text-silver-500 focus:border-cyan-400/70 focus:outline-none"
                />
              </div>
            ) : null}
          </div>

          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {job.images.map(({ seed, imageUrl }, i) => (
              <li key={seed} className="panel overflow-hidden">
                {imageUrl ? (
                  <AiImage
                    url={imageUrl}
                    alt={`Option ${i + 1}: ${job.input.prompt}`}
                    aspect={job.input.aspect}
                    start={i <= activeIndex}
                    onSettled={() => advance(job.id, i)}
                  />
                ) : (
                  <DemoArt
                    seed={seed}
                    style={job.input.style}
                    mood={job.input.mood}
                    aspect={job.input.aspect}
                    className="block w-full"
                  />
                )}
                <form action={characterId ? addCharacterVersion : saveNewCharacter} className="p-3">
                  <input type="hidden" name="jobId" value={job.id} />
                  <input type="hidden" name="seed" value={seed} />
                  {characterId ? (
                    <input type="hidden" name="characterId" value={characterId} />
                  ) : (
                    <input type="hidden" name="name" value={name} />
                  )}
                  <SubmitButton pendingText="Saving…" variant="secondary" className="h-9 w-full text-xs">
                    {characterId ? "Save as new version" : `Keep option ${i + 1}`}
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
