import "server-only";
import { createHash } from "node:crypto";
import type { CharacterImageInput, ImageProvider } from "./types";

/**
 * Free test provider. It does NOT call any AI model. It returns deterministic
 * seeds that the UI renders as original abstract placeholder art, clearly
 * labelled "Demo". Lets the whole Character Studio flow be built and tested
 * at zero cost.
 */
export const demoImageProvider: ImageProvider = {
  id: "demo",
  model: "aniverse-demo-v1",
  isDemo: true,
  label: "Demo",
  estimateCredits() {
    return 0;
  },
  async generate(input: CharacterImageInput, { idempotencyKey }) {
    const images = Array.from({ length: input.variations }, (_, i) =>
      ({
        seed: createHash("sha256")
          .update(`${idempotencyKey}:${input.prompt}:${input.style}:${input.mood}:${i}`)
          .digest("hex")
          .slice(0, 16),
      }),
    );
    return { images };
  },
};
