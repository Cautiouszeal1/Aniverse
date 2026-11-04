import { deleteClip } from "@/app/dashboard/animations/actions";
import { ConfirmDelete } from "@/components/studio/confirm-delete";
import type { Clip } from "@/lib/data";
import { cn } from "@/lib/cn";

const STATUS: Record<Clip["status"], { label: string; tone: string }> = {
  queued: { label: "Queued", tone: "text-silver-300 border-silver-300/20" },
  processing: { label: "Animating…", tone: "text-cyan-200 border-cyan-400/30" },
  completed: { label: "Ready", tone: "text-emerald-200 border-emerald-400/30" },
  failed: { label: "Failed · refunded", tone: "text-rose-200 border-rose-400/30" },
  cancelled: { label: "Cancelled", tone: "text-silver-400 border-silver-300/20" },
};

export function StatusPill({ clip }: { clip: Clip }) {
  const s = clip.is_demo ? { label: "Demo preview", tone: "text-amber-200 border-amber-400/30" } : STATUS[clip.status];
  const label = clip.status === "failed" && clip.refunded ? `Failed · ${clip.refunded} credits refunded` : s.label;
  return <span className={cn("rounded-full border px-2.5 py-0.5 text-xs", s.tone)}>{label}</span>;
}

/** Plays the clip, or shows its state honestly (no fake media). */
export function ClipScreen({ clip, title }: { clip: Clip; title: string }) {
  const tall = clip.aspect_ratio === "9:16";
  const frame = cn(
    "relative overflow-hidden rounded-xl border border-silver-300/10 bg-navy-950",
    tall ? "mx-auto aspect-[9/16] max-h-[420px]" : "aspect-video w-full",
  );
  if (clip.video_url) {
    return (
      <video
        src={clip.video_url}
        controls
        playsInline
        preload="metadata"
        className={cn(frame, "object-contain")}
        aria-label={`${title}, version ${clip.version}`}
      />
    );
  }
  if (clip.is_demo) {
    return (
      <div className={cn(frame, "flex items-center justify-center p-6 text-center")}>
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-violet-600/20 via-transparent to-cyan-400/15" aria-hidden="true" />
        <div className="relative">
          <p className="text-xs uppercase tracking-widest text-amber-200">Demo preview · not AI video</p>
          <p className="mt-2 font-display text-lg text-white">{title}</p>
          <p className="mx-auto mt-2 max-w-sm text-xs text-silver-400">{clip.prompt.slice(0, 220)}…</p>
        </div>
      </div>
    );
  }
  return (
    <div className={cn(frame, "flex flex-col items-center justify-center gap-3 p-6 text-center")}>
      {clip.status === "processing" || clip.status === "queued" ? (
        <>
          <span aria-hidden="true" className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-300" />
          <p className="text-sm text-silver-200">AniVerse AI is animating this scene…</p>
          <p className="text-xs text-silver-500">Usually 1–3 minutes. Safe to leave this page.</p>
        </>
      ) : clip.status === "failed" ? (
        <>
          <p className="text-sm text-rose-200">This clip couldn&apos;t be made.</p>
          <p className="text-xs text-silver-500">
            {clip.refunded ? `Your ${clip.refunded} credits were returned.` : "Any credits used are returned automatically."} Try again, maybe with a simpler description.
          </p>
        </>
      ) : (
        <p className="text-sm text-silver-400">The video file is missing.</p>
      )}
    </div>
  );
}

export function ClipActions({ clip }: { clip: Clip }) {
  const busy = clip.status === "processing" || clip.status === "queued";
  return (
    <div className="flex flex-wrap items-center gap-2">
      {clip.download_url ? (
        <a
          href={clip.download_url}
          className="inline-flex h-10 items-center rounded-full border border-silver-300/20 px-4 text-sm text-silver-100 hover:border-cyan-400/50"
        >
          Download MP4
        </a>
      ) : null}
      {!busy ? (
        <ConfirmDelete
          action={deleteClip}
          fields={{ clipId: clip.id }}
          label="Delete"
          confirmText={`Delete version ${clip.version}? This can't be undone.`}
        />
      ) : null}
    </div>
  );
}
