import "server-only";
import type { QualityId } from "@/lib/animation/options";

/**
 * Video engine adapter. Users only ever see "AniVerse AI"; the underlying
 * service and its model names stay on the server.
 */

export const AV_VIDEO_PROVIDER_ID = "aniverse-video";
export const AV_VIDEO_MODELS: Record<QualityId, string> = {
  "motion-standard": "av-motion-1",
  "motion-pro": "av-motion-pro",
};

const API_BASE = (process.env.POLLINATIONS_API_BASE_URL?.trim() || "https://gen.pollinations.ai").replace(/\/$/, "");
const ENGINE_MODELS: Record<QualityId, string> = {
  "motion-standard": process.env.VIDEO_MODEL_STANDARD?.trim() || "seedance",
  "motion-pro": process.env.VIDEO_MODEL_PRO?.trim() || "veo",
};
export const RENDER_TIMEOUT_MS = 280_000;
const MAX_BYTES = 50 * 1024 * 1024;

function apiKey() {
  return process.env.POLLINATIONS_API_KEY?.trim() || "";
}

/** "live" when a key is set, unless VIDEO_PROVIDER=demo forces the labelled demo. */
export function videoMode(): "live" | "demo" {
  if (process.env.VIDEO_PROVIDER?.trim() === "demo") return "demo";
  return apiKey() ? "live" : "demo";
}

export class VideoError extends Error {
  constructor(
    message: string,
    /** The engine's own account is out of funds: pause the service. */
    readonly outOfFunds = false,
  ) {
    super(message);
  }
}

export type VideoRequest = {
  quality: QualityId;
  prompt: string;
  durationSeconds: number;
  aspect: "16:9" | "9:16";
  seed: number;
  /** Optional start frame (short-lived signed URL of a character picture). */
  startImageUrl?: string | null;
};

export function videoUrl(req: VideoRequest) {
  const params = new URLSearchParams({
    model: ENGINE_MODELS[req.quality],
    duration: String(req.durationSeconds),
    aspectRatio: req.aspect,
    seed: String(req.seed),
    nologo: "true",
    private: "true",
  });
  if (req.startImageUrl) params.set("image", req.startImageUrl);
  return `${API_BASE}/image/${encodeURIComponent(req.prompt)}?${params}`;
}

/** Renders one clip and returns the video bytes. Throws VideoError. */
export async function renderVideo(
  req: VideoRequest,
  fetcher: typeof fetch = fetch,
): Promise<{ bytes: ArrayBuffer; contentType: string }> {
  const key = apiKey();
  if (!key) throw new VideoError("video engine not configured");

  let res: Response;
  try {
    res = await fetcher(videoUrl(req), {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(RENDER_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new VideoError("timed out");
  }

  if (res.status === 402) throw new VideoError("engine out of funds", true);
  if (res.status === 401 || res.status === 403) throw new VideoError("engine rejected key", true);
  if (!res.ok) throw new VideoError(`engine error ${res.status}`);

  const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!["video/mp4", "video/webm"].includes(contentType)) throw new VideoError("unexpected result type");
  const bytes = await res.arrayBuffer();
  if (bytes.byteLength < 10_000 || bytes.byteLength > MAX_BYTES) throw new VideoError("unexpected result size");
  return { bytes, contentType };
}
