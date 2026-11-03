import "server-only";
/**
 * Pollinations.ai helpers shared by server and browser.
 *
 * Two modes:
 * - Keyed (recommended): the server calls gen.pollinations.ai with a secret
 *   key, then saves the image to private Supabase Storage.
 * - Keyless fallback: the browser loads image.pollinations.ai directly
 *   (heavily rate-limited and watermarked); used only when no key is set.
 */
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


