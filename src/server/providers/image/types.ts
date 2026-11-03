import type { AspectId, MoodId, StyleId } from "@/lib/characters/options";

export type CharacterImageInput = {
  prompt: string;
  style: StyleId;
  mood: MoodId;
  aspectRatio: AspectId;
  variations: number;
};

export type GeneratedImage = {
  /** Deterministic seed (demo) or provider seed. */
  seed: string;
  /** Where the finished image can be loaded from (URL-based providers). */
  imageUrl?: string;
};

export type ImageGenerationResult = {
  images: GeneratedImage[];
  providerRequestId?: string;
};

/**
 * Every image provider (demo, fal.ai, …) implements this. Provider calls only
 * ever run on the server; API keys never reach the browser.
 */
export interface ImageProvider {
  readonly id: string;
  readonly model: string;
  /** True for the free test provider, whose output is clearly labelled. */
  readonly isDemo: boolean;
  /** Short label shown to users, e.g. "Demo" or "Free AI (beta)". */
  readonly label: string;
  /** Credits charged for one generation with these inputs. */
  estimateCredits(input: CharacterImageInput): number;
  generate(input: CharacterImageInput, opts: { idempotencyKey: string }): Promise<ImageGenerationResult>;
}
