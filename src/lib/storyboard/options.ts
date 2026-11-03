export const SHOT_TYPES = [
  { id: "wide", label: "Wide shot" },
  { id: "medium", label: "Medium shot" },
  { id: "close-up", label: "Close-up" },
  { id: "extreme-close-up", label: "Extreme close-up" },
  { id: "over-the-shoulder", label: "Over the shoulder" },
  { id: "aerial", label: "Aerial" },
  { id: "pov", label: "Point of view" },
] as const;

export type ShotType = (typeof SHOT_TYPES)[number]["id"];

export const MAX_SCENES = 60;

export function formatDuration(totalSeconds: number) {
  const s = Math.round(totalSeconds);
  const m = Math.floor(s / 60);
  return m ? `${m}m ${String(s % 60).padStart(2, "0")}s` : `${s}s`;
}
