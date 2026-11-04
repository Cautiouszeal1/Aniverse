"use client";

import { useActionState, useState } from "react";
import { generateClip, type ClipState } from "@/app/dashboard/animations/actions";
import { SubmitButton } from "@/components/ui/form";
import { ASPECTS, DURATIONS, clipDurationFor, type QualityId } from "@/lib/animation/options";
import { cn } from "@/lib/cn";

type PriceOption = { id: QualityId; label: string; description: string; credits: number; maxSeconds: number };

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `k-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function ClipGenerator({
  projectId,
  sceneId,
  sceneSeconds,
  prices,
  balance,
  demo,
  paused,
  busy,
}: {
  projectId: string;
  sceneId: string;
  sceneSeconds: number;
  prices: PriceOption[];
  balance: number;
  demo: boolean;
  paused: boolean;
  busy: boolean;
}) {
  const [quality, setQuality] = useState<QualityId>(prices[0]?.id ?? "motion-standard");
  const price = prices.find((p) => p.id === quality) ?? prices[0];
  const durations = DURATIONS[quality].filter((d) => d <= (price?.maxSeconds ?? 10));
  const [duration, setDuration] = useState(() => clipDurationFor(quality, sceneSeconds, price?.maxSeconds ?? 5));
  const [aspect, setAspect] = useState<string>("16:9");
  const [requestKey, setRequestKey] = useState(newKey);
  const [state, action] = useActionState(async (prev: ClipState, form: FormData) => {
    const result = await generateClip(prev, form);
    if (result.ok) setRequestKey(newKey());
    return result;
  }, {});

  if (!price) return <p className="text-sm text-silver-500">Animation isn&apos;t available right now.</p>;
  const cost = demo ? 0 : price.credits;
  const short = !demo && balance < cost;
  const effectiveDuration = durations.includes(duration) ? duration : durations[durations.length - 1];

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="sceneId" value={sceneId} />
      <input type="hidden" name="requestKey" value={requestKey} />
      <input type="hidden" name="quality" value={quality} />
      <input type="hidden" name="duration" value={effectiveDuration} />
      <input type="hidden" name="aspect" value={aspect} />

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-silver-100">Quality</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {prices.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setQuality(p.id);
                setDuration(clipDurationFor(p.id, sceneSeconds, p.maxSeconds));
              }}
              aria-pressed={quality === p.id}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
                quality === p.id ? "border-cyan-400/60 bg-cyan-400/5" : "border-silver-300/15 hover:border-silver-300/30",
              )}
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-white">{p.label}</span>
                <span className="text-sm text-cyan-200">{demo ? "Free demo" : `${p.credits} credits`}</span>
              </span>
              <span className="mt-1 block text-xs text-silver-400">{p.description}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-4">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-silver-100">Length</legend>
          <div className="flex gap-2">
            {durations.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                aria-pressed={effectiveDuration === d}
                className={cn(
                  "h-9 rounded-full border px-3 text-sm",
                  effectiveDuration === d ? "border-cyan-400/60 text-white" : "border-silver-300/15 text-silver-300",
                )}
              >
                {d}s
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-silver-100">Shape</legend>
          <div className="flex gap-2">
            {ASPECTS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAspect(a.id)}
                aria-pressed={aspect === a.id}
                className={cn(
                  "h-9 rounded-full border px-3 text-sm",
                  aspect === a.id ? "border-cyan-400/60 text-white" : "border-silver-300/15 text-silver-300",
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div>
        <label htmlFor={`extra-${sceneId}`} className="mb-1.5 block text-sm font-medium text-silver-100">
          Extra direction <span className="font-normal text-silver-500">(optional)</span>
        </label>
        <input
          id={`extra-${sceneId}`}
          name="extra"
          maxLength={300}
          placeholder="e.g. slow motion, sunset light, camera circles the hero"
          className="h-11 w-full rounded-xl border border-silver-300/15 bg-navy-950/60 px-3.5 text-[0.95rem] text-white placeholder:text-silver-500 focus:border-cyan-400/70 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingText="Starting…" disabled={paused || short || busy}>
          {busy ? "Animating…" : demo ? "Create demo preview" : `Animate · ${cost} credits`}
        </SubmitButton>
        <span className="text-xs text-silver-500">
          {paused
            ? "AniVerse AI is briefly unavailable. Nobody is being charged — try again shortly."
            : busy
              ? "A clip for this scene is being made. You can leave this page."
              : short
                ? `You have ${balance} credits. Top up to animate this scene.`
                : demo
                  ? "Demo mode: shows a labelled preview, not AI video."
                  : `You have ${balance} credits. Refunded automatically if it fails.`}
        </span>
      </div>
      {state.error ? <p role="alert" className="text-sm text-rose-300">{state.error}</p> : null}
      {state.message && (busy || demo) ? <p role="status" className="text-sm text-cyan-200">{state.message}</p> : null}
    </form>
  );
}
