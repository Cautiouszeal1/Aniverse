import "server-only";
import { createHash } from "node:crypto";
import { POLLINATIONS_MODEL, pollinationsUrl } from "@/lib/images/pollinations";
import type { CharacterImageInput, ImageProvider } from "./types";

/**
 * Free real AI images via Pollinations.ai (FLUX model). No account or key.
 * The server only prepares deterministic image URLs; each visitor's browser
 * loads them, which keeps AniVerse's server cost at zero.
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
    const images = Array.from({ length: input.variations }, (_, i) => {
      const hex = createHash("sha256")
        .update(`${idempotencyKey}:${i}`)
        .digest("hex");
      const seed = parseInt(hex.slice(0, 8), 16) % 2_000_000_000;
      return {
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
