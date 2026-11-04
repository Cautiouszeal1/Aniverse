/** Brand-neutral animation options (safe in the browser). */
export const ASPECTS = [
  { id: "16:9", label: "Landscape 16:9" },
  { id: "9:16", label: "Portrait 9:16" },
] as const;
export type AnimAspect = (typeof ASPECTS)[number]["id"];

export type QualityId = "motion-standard" | "motion-pro";

/** Durations each quality supports (seconds). */
export const DURATIONS: Record<QualityId, number[]> = {
  "motion-standard": [3, 4, 5],
  "motion-pro": [4, 6, 8],
};

export const VIDEO_BUCKET = "animations";

/** animations/<user id>/<job id>.mp4 */
export function isVideoPath(p: string | null | undefined): p is string {
  return typeof p === "string" && /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(mp4|webm)$/i.test(p);
}

export function clipDurationFor(quality: QualityId, sceneSeconds: number, maxSeconds: number) {
  const allowed = DURATIONS[quality].filter((d) => d <= maxSeconds);
  if (!allowed.length) return Math.min(maxSeconds, 5);
  // closest allowed duration to the scene's planned length
  return allowed.reduce((best, d) => (Math.abs(d - sceneSeconds) < Math.abs(best - sceneSeconds) ? d : best), allowed[0]);
}
