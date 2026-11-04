"use client";

import { useRef, useState } from "react";

/** Plays the latest ready clip of every scene back to back, in story order. */
export function FilmPlayer({ clips }: { clips: { url: string; title: string }[] }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  if (!clips.length) {
    return (
      <p className="text-sm text-silver-500">
        Your film appears here once at least one scene has a finished clip.
      </p>
    );
  }
  const current = clips[Math.min(index, clips.length - 1)];

  return (
    <div className="space-y-3">
      <video
        ref={ref}
        key={current.url}
        src={current.url}
        playsInline
        controls
        autoPlay={playing}
        onEnded={() => {
          if (index < clips.length - 1) setIndex(index + 1);
          else setPlaying(false);
        }}
        className="aspect-video w-full rounded-xl border border-silver-300/10 bg-navy-950 object-contain"
        aria-label={`Film preview, scene ${index + 1}: ${current.title}`}
      />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => {
            setIndex(0);
            setPlaying(true);
            requestAnimationFrame(() => ref.current?.play().catch(() => {}));
          }}
          className="inline-flex h-10 items-center rounded-full bg-gradient-to-r from-violet-600 to-violet-500 px-4 font-medium text-white"
        >
          ▶ Play film from start
        </button>
        <span className="text-silver-400">
          Scene {index + 1} of {clips.length} · {current.title}
        </span>
      </div>
      <ol className="flex flex-wrap gap-2">
        {clips.map((c, i) => (
          <li key={c.url}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              aria-current={i === index ? "true" : undefined}
              className={`rounded-full border px-3 py-1 text-xs ${i === index ? "border-cyan-400/60 text-white" : "border-silver-300/15 text-silver-400"}`}
            >
              {i + 1}. {c.title}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
