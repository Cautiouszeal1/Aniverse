/**
 * Pollinations.ai helpers shared by server and browser.
 *
 * Two modes:
 * - Keyed (recommended): the server calls gen.pollinations.ai with a secret
 *   key, then saves the image to private Supabase Storage.
 * - Keyless fallback: the browser loads image.pollinations.ai directly
 *   (heavily rate-limited and watermarked); used only when no key is set.
 */
export const POLLINATIONS_BASE =
  process.env.NEXT_PUBLIC_POLLINATIONS_BASE_URL?.replace(/\/$/, "") ||
  "https://image.pollinations.ai";

export const POLLINATIONS_MODEL = "flux";

const SIZES: Record<string, [number, number]> = {
  "1:1": [768, 768],
  "3:4": [768, 1024],
  "16:9": [1024, 576],
};

const STYLE_TEXT: Record<string, string> = {
  "3d-animated": "stylised 3D animated film character, soft global illumination",
  "2d-cartoon": "clean 2D cartoon character, bold outlines, flat colours",
  anime: "anime-inspired character illustration, expressive eyes, cel shading",
  storybook: "watercolour children's storybook illustration, soft paper texture",
  claymation: "clay stop-motion character, handmade plasticine texture",
  pixel: "pixel art character sprite, limited palette",
};

const MOOD_TEXT: Record<string, string> = {
  heroic: "heroic, confident pose, warm rim light",
  playful: "playful, cheerful expression, bright colours",
  mysterious: "mysterious, moody lighting, cool tones",
  gentle: "gentle, calm expression, soft pastel light",
  fierce: "fierce, dynamic pose, dramatic contrast",
};

export function sizeFor(aspect: string): [number, number] {
  return SIZES[aspect] ?? SIZES["1:1"];
}

export function buildFullPrompt(opts: { prompt: string; style: string; mood: string }) {
  return [
    opts.prompt.trim(),
    STYLE_TEXT[opts.style] ?? "",
    MOOD_TEXT[opts.mood] ?? "",
    "original character design, full body, single character, centred, simple background",
  ]
    .filter(Boolean)
    .join(", ");
}

export function imageParams(aspect: string, seed: number) {
  const [width, height] = sizeFor(aspect);
  return new URLSearchParams({
    width: String(width),
    height: String(height),
    seed: String(seed),
    model: POLLINATIONS_MODEL,
    nologo: "true",
    private: "true",
    safe: "true",
  });
}

/** Keyless browser URL (fallback mode only). */
export function pollinationsUrl(opts: {
  prompt: string;
  style: string;
  mood: string;
  aspect: string;
  seed: number;
}) {
  return `${POLLINATIONS_BASE}/prompt/${encodeURIComponent(buildFullPrompt(opts))}?${imageParams(opts.aspect, opts.seed)}`;
}

/** Only render keyless images from the provider we actually use. */
export function isAllowedImageUrl(url: string | null | undefined): url is string {
  return typeof url === "string" && url.startsWith(`${POLLINATIONS_BASE}/prompt/`);
}

/** Storage paths look like "<user id>/<job id>/<seed>.jpg". */
export const IMAGE_BUCKET = "character-images";
export function isStoragePath(p: string | null | undefined): p is string {
  return typeof p === "string" && /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/\d+\.(jpg|png|webp)$/i.test(p);
}
