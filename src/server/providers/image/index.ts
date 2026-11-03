import "server-only";
import { demoImageProvider } from "./demo";
import { pollinationsImageProvider } from "./pollinations";
import type { ImageProvider } from "./types";

/**
 * Picks the image provider from IMAGE_PROVIDER.
 * - "pollinations" (default): free real AI images (beta).
 * - "demo": free placeholder art, no AI, used in tests.
 * Paid providers (e.g. fal.ai) are added here once approved; they must go
 * through the server-side credit flow before they can be enabled.
 */
export function getImageProvider(): ImageProvider {
  const id = (process.env.IMAGE_PROVIDER ?? "pollinations").trim().toLowerCase();
  switch (id) {
    case "demo":
      return demoImageProvider;
    case "pollinations":
    default:
      return pollinationsImageProvider;
  }
}

export type { ImageProvider, CharacterImageInput } from "./types";
