"use client";

import { isStoragePath } from "@/lib/images/paths";
import { AiImage } from "./ai-image";
import { DemoArt } from "./demo-art";

/** Shows a saved character version: the AI image, or demo art for demo versions. */
export function CharacterVisual({
  imagePath,
  imageUrl,
  seed,
  style,
  mood,
  aspect,
  name,
  className,
  showBadge = true,
}: {
  imagePath: string | null;
  /** Signed URL for images kept in private storage. */
  imageUrl?: string | null;
  seed: string;
  style: string;
  mood: string;
  aspect: string;
  name: string;
  className?: string;
  showBadge?: boolean;
}) {
  if (imageUrl) {
    return <AiImage url={imageUrl} alt={name} aspect={aspect} className={className} />;
  }
  // Saved AI image that couldn't be signed, or an image from an early test
  // version that is no longer supported.
  if (isStoragePath(imagePath) || (imagePath && /^https?:\/\//.test(imagePath))) {
    return (
      <div className={className}>
        <div className="flex aspect-square items-center justify-center bg-navy-900 p-4 text-center text-xs text-silver-400">
          Image unavailable
        </div>
      </div>
    );
  }
  return <DemoArt seed={seed} style={style} mood={mood} aspect={aspect} className={className} label={showBadge} />;
}
