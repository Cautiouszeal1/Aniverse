import "server-only";
import { createHash } from "node:crypto";
import {
  POLLINATIONS_MODEL,
  buildFullPrompt,
  imageParams,
  pollinationsUrl,
} from "@/lib/images/pollinations";
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
export const pollinationsImageProvider: ImageProvider = {
  id: "pollinations",
  model: POLLINATIONS_MODEL,
  isDemo: false,
  label: "Free AI (beta)",
  estimateCredits() {
    return 0;
  },
  async generate(input: CharacterImageInput, { idempotencyKey }) {
    const serverMode = pollinationsServerMode();
    const images = Array.from({ length: input.variations }, (_, i) => {
      const seed = seedFor(idempotencyKey, i);
      return serverMode
        ? { seed: String(seed) }
        : {
            seed: String(seed),
            imageUrl: pollinationsUrl({
              prompt: input.prompt,
              style: input.style,
              mood: input.mood,
              aspect: input.aspectRatio,
              seed,
            }),
          };
    });
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
    throw new RenderError("The image service didn't respond in time", true);
  }

  if (res.status === 401 || res.status === 403) {
    throw new RenderError("The AI image key was rejected", false);
  }
  if (res.status === 429 || res.status >= 500) {
    throw new RenderError("The image service is busy", true);
  }
  if (!res.ok) {
    throw new RenderError("The image service couldn't make this image", false);
  }

  const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
    throw new RenderError("The image service returned something that isn't an image", true);
  }
  const bytes = await res.arrayBuffer();
  if (bytes.byteLength < 1000 || bytes.byteLength > MAX_BYTES) {
    throw new RenderError("The image service returned an unexpected file", true);
  }
  return { bytes, contentType };
}
