import "server-only";
import { demoImageProvider } from "./demo";
import type { ImageProvider } from "./types";

/**
 * Picks the image provider from IMAGE_PROVIDER. Only "demo" exists today;
 * real providers (e.g. fal.ai) are added here once the founders approve the
 * provider, its commercial-use terms and its cost per image. Unknown values
 * fall back to demo rather than pretending to call a model that isn't wired.
 */
export function getImageProvider(): ImageProvider {
  const id = (process.env.IMAGE_PROVIDER ?? "demo").trim().toLowerCase();
  switch (id) {
    case "demo":
    default:
      return demoImageProvider;
  }
}

export type { ImageProvider, CharacterImageInput } from "./types";
