import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { buildFullPrompt, imageParams } from "@/lib/images/pollinations";
import type { CharacterImageInput, ImageProvider } from "./types";

const API_BASE = (process.env.POLLINATIONS_API_BASE_URL?.trim() || "https://gen.pollinations.ai").replace(/\/$/, "");
const RENDER_TIMEOUT_MS = 90_000;
const MAX_BYTES = 6 * 1024 * 1024;

function apiKey() {
  return process.env.POLLINATIONS_API_KEY?.trim() || "";
}

/** True when a secret key is configured and images are made on the server. */
export function pollinationsServerMode() {
  return Boolean(apiKey());
}

function seedFor(idempotencyKey: string, i: number) {
  const hex = createHash("sha256").update(`${idempotencyKey}:${i}`).digest("hex");
  return parseInt(hex.slice(0, 8), 16) % 2_000_000_000;
}

/**
 * Free AI images via Pollinations.ai (FLUX). With POLLINATIONS_API_KEY set,
 * generation happens on the server and images are stored privately. Without
 * it, the browser loads the keyless endpoint (rate-limited fallback).
 */
/** Internal, brand-neutral identifiers stored with jobs and versions. */
export const AV_IMAGE_PROVIDER_ID = "aniverse-image";
export const AV_IMAGE_MODEL = "av-image-1";
/** Earlier rows may carry the old identifier. */
export const LEGACY_PROVIDER_IDS = ["pollinations"];

export const pollinationsImageProvider: ImageProvider = {
  id: AV_IMAGE_PROVIDER_ID,
  model: AV_IMAGE_MODEL,
  isDemo: false,
  label: "AniVerse AI",
  estimateCredits() {
    return 0;
  },
  async generate(input: CharacterImageInput, { idempotencyKey }) {
    if (!pollinationsServerMode()) {
      throw new RenderError("AI images are temporarily unavailable", true);
    }
    // Images are painted later, one request per image, on the server.
    const images = Array.from({ length: input.variations }, (_, i) => ({
      seed: String(seedFor(idempotencyKey, i)),
    }));
    return { images };
  },
};

export class RenderError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

/** Server-side: render one image with the secret key and return its bytes. */
export async function renderPollinationsImage(input: {
  prompt: string;
  style: string;
  mood: string;
  aspect: string;
  seed: number;
}): Promise<{ bytes: ArrayBuffer; contentType: string }> {
  const key = apiKey();
  if (!key) throw new RenderError("AI image key is not configured", false);

  const url = `${API_BASE}/image/${encodeURIComponent(buildFullPrompt(input))}?${imageParams(input.aspect, input.seed)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(RENDER_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new RenderError("AniVerse AI took too long", true);
  }

  if (res.status === 401 || res.status === 403) {
    console.error("[ai-image] provider rejected the API key");
    throw new RenderError("AniVerse AI is temporarily unavailable", false);
  }
  if (res.status === 429 || res.status >= 500) {
    throw new RenderError("AniVerse AI is busy", true);
  }
  if (!res.ok) {
    throw new RenderError("AniVerse AI couldn't paint this one. Try a different description.", false);
  }

  const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
    throw new RenderError("AniVerse AI returned an unexpected result", true);
  }
  const raw = await res.arrayBuffer();
  if (raw.byteLength < 1000 || raw.byteLength > MAX_BYTES) {
    throw new RenderError("AniVerse AI returned an unexpected result", true);
  }
  // Re-encode: strips all embedded metadata (generator tags, EXIF, etc.)
  // and stores a consistent JPEG.
  let out: Buffer;
  try {
    out = await sharp(Buffer.from(raw)).rotate().jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  } catch {
    throw new RenderError("AniVerse AI returned an unexpected result", true);
  }
  return {
    bytes: out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer,
    contentType: "image/jpeg",
  };
}
