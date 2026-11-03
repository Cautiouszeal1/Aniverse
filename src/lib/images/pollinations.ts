/**
 * Pollinations.ai free image endpoint. Images are fetched by the user's own
 * browser (each visitor has their own free rate limit), and the URL is
 * deterministic, so a saved version always shows the same picture.
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

export function pollinationsUrl(opts: {
  prompt: string;
  style: string;
  mood: string;
  aspect: string;
  seed: number;
}) {
  const [width, height] = SIZES[opts.aspect] ?? SIZES["1:1"];
  const full = [
    opts.prompt.trim(),
    STYLE_TEXT[opts.style] ?? "",
    MOOD_TEXT[opts.mood] ?? "",
    "original character design, full body, single character, centred, simple background",
  ]
    .filter(Boolean)
    .join(", ");
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    seed: String(opts.seed),
    model: POLLINATIONS_MODEL,
    nologo: "true",
    private: "true",
    safe: "true",
  });
  return `${POLLINATIONS_BASE}/prompt/${encodeURIComponent(full)}?${params}`;
}

/** Only render images from the provider we actually use. */
export function isAllowedImageUrl(url: string | null | undefined): url is string {
  return typeof url === "string" && url.startsWith(`${POLLINATIONS_BASE}/prompt/`);
}
