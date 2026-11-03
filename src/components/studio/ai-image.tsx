"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

const ASPECT_CLASS: Record<string, string> = {
  "1:1": "aspect-square",
  "3:4": "aspect-[3/4]",
  "16:9": "aspect-video",
};

const RETRY_DELAY_MS = 16_000; // free tier allows roughly one image per 15s
const MAX_RETRIES = 4;

/**
 * Loads one AI image in the browser, with a painting placeholder, automatic
 * retries when the free service is busy, and a manual retry button.
 * `start` lets a parent load several images one after another.
 */
export function AiImage({
  url,
  alt,
  aspect,
  start = true,
  onSettled,
  className,
  badge,
}: {
  url: string;
  alt: string;
  aspect: string;
  start?: boolean;
  onSettled?: () => void;
  className?: string;
  badge?: string;
}) {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<"waiting" | "loading" | "loaded" | "retrying" | "failed">(
    "waiting",
  );

  const visibleStatus = start && status === "waiting" ? "loading" : status;

  useEffect(() => {
    if (status !== "retrying") return;
    const t = setTimeout(() => {
      setAttempt((a) => a + 1);
      setStatus("loading");
    }, RETRY_DELAY_MS);
    return () => clearTimeout(t);
  }, [status]);

  const src = attempt === 0 ? url : `${url}&r=${attempt}`;

  return (
    <div className={cn("relative overflow-hidden bg-navy-900", ASPECT_CLASS[aspect] ?? "aspect-square", className)}>
      {start ? (
        // eslint-disable-next-line @next/next/no-img-element -- external, per-user generated image
        <img
          key={src}
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
            visibleStatus === "loaded" ? "opacity-100" : "opacity-0",
          )}
          onLoad={() => {
            setStatus("loaded");
            onSettled?.();
          }}
          onError={() => {
            if (attempt < MAX_RETRIES) setStatus("retrying");
            else {
              setStatus("failed");
              onSettled?.();
            }
          }}
        />
      ) : null}

      {visibleStatus !== "loaded" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
          {visibleStatus === "failed" ? (
            <>
              <p className="text-xs text-silver-300">AniVerse AI is busy right now.</p>
              <button
                type="button"
                onClick={() => {
                  setAttempt((a) => a + 1);
                  setStatus("loading");
                }}
                className="rounded-full border border-silver-300/20 px-3 py-1 text-xs text-silver-100 hover:border-cyan-400/50"
              >
                Try again
              </button>
            </>
          ) : (
            <>
              <span
                aria-hidden="true"
                className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-400"
              />
              <p className="text-xs text-silver-400" role="status">
                {visibleStatus === "waiting"
                  ? "Waiting in line…"
                  : visibleStatus === "retrying"
                    ? "Service busy, retrying…"
                    : "Painting…"}
              </p>
            </>
          )}
        </div>
      ) : null}

      {badge ? (
        <span className="absolute left-2 top-2 rounded-full bg-navy-950/75 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-cyan-200">
          {badge}
        </span>
      ) : null}
    </div>
  );
}
