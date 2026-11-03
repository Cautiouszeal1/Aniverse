"use client";

import { useEffect, useState } from "react";
import { renderJobImage } from "@/app/dashboard/studio/actions";
import { cn } from "@/lib/cn";

const ASPECT_CLASS: Record<string, string> = {
  "1:1": "aspect-square",
  "3:4": "aspect-[3/4]",
  "16:9": "aspect-video",
};

const AUTO_RETRIES = 2;
const RETRY_DELAY_MS = 4000;

type State =
  | { kind: "painting"; attempt: number }
  | { kind: "ready"; url: string }
  | { kind: "error"; message: string; retryable: boolean };

/**
 * Asks the server to paint one image (with AniVerse's secret AI key), then
 * shows it. Retries automatically when the service is briefly busy.
 */
export function ServerImage({
  jobId,
  seed,
  aspect,
  alt,
  onReady,
}: {
  jobId: string;
  seed: string;
  aspect: string;
  alt: string;
  onReady?: () => void;
}) {
  const [state, setState] = useState<State>({ kind: "painting", attempt: 0 });
  const attempt = state.kind === "painting" ? state.attempt : -1;

  useEffect(() => {
    if (attempt < 0) return;
    let cancelled = false;
    const run = async () => {
      if (attempt > 0) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      let result;
      try {
        result = await renderJobImage(jobId, seed);
      } catch {
        result = { error: "Connection problem.", retryable: true };
      }
      if (cancelled) return;
      if ("url" in result) {
        setState({ kind: "ready", url: result.url });
        onReady?.();
      } else if (result.retryable && attempt < AUTO_RETRIES) {
        setState({ kind: "painting", attempt: attempt + 1 });
      } else {
        setState({ kind: "error", message: result.error, retryable: result.retryable });
      }
    };
    run();
    return () => {
      cancelled = true;
    };
    // onReady is intentionally not a dependency: it must not restart painting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, seed, attempt]);

  return (
    <div className={cn("relative overflow-hidden bg-navy-900", ASPECT_CLASS[aspect] ?? "aspect-square")}>
      {state.kind === "ready" ? (
        // eslint-disable-next-line @next/next/no-img-element -- private signed image URL
        <img src={state.url} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
          {state.kind === "error" ? (
            <>
              <p className="text-xs text-silver-300">{state.message}</p>
              {state.retryable ? (
                <button
                  type="button"
                  onClick={() => setState({ kind: "painting", attempt: 0 })}
                  className="rounded-full border border-silver-300/20 px-3 py-1 text-xs text-silver-100 hover:border-cyan-400/50"
                >
                  Try again
                </button>
              ) : null}
            </>
          ) : (
            <>
              <span aria-hidden="true" className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-400" />
              <p className="text-xs text-silver-400" role="status">
                {state.attempt > 0 ? "Service busy, retrying…" : "Painting…"}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
