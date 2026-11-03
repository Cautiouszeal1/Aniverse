import { useId } from "react";
import { cn } from "@/lib/cn";

/**
 * AniVerse mark: a stylised "A" whose crossbar is a dimensional portal ring.
 * Original geometric artwork — safe to use as the interim logo until the
 * creative founder delivers the final mark.
 */
export function LogoMark({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const g1 = `av-g1-${uid}`;
  const g2 = `av-g2-${uid}`;
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={cn("h-8 w-8", className)}
    >
      <defs>
        <linearGradient id={g1} x1="6" y1="36" x2="34" y2="4">
          <stop stopColor="#6440F0" />
          <stop offset="1" stopColor="#2EE6F6" />
        </linearGradient>
        <linearGradient id={g2} x1="8" y1="24" x2="32" y2="24">
          <stop stopColor="#2EE6F6" />
          <stop offset="1" stopColor="#B9A8FF" />
        </linearGradient>
      </defs>
      <path
        d="M20 4 L35 35 H29.2 L20 15.4 L10.8 35 H5 Z"
        fill={`url(#${g1})`}
      />
      <ellipse
        cx="20"
        cy="25.5"
        rx="12.5"
        ry="4"
        stroke={`url(#${g2})`}
        strokeWidth="2.2"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-display text-lg font-semibold tracking-tight text-white">
        Ani<span className="text-cyan-300">Verse</span>
      </span>
    </span>
  );
}
