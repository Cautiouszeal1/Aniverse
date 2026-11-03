"use client";

import { isAllowedImageUrl } from "@/lib/images/pollinations";
import { AiImage } from "./ai-image";
import { DemoArt } from "./demo-art";

/** Shows a saved character version: the AI image, or demo art for demo versions. */
export function CharacterVisual({
  imagePath,
  seed,
  style,
  mood,
  aspect,
  name,
  className,
  showBadge = true,
}: {
  imagePath: string | null;
  seed: string;
  style: string;
  mood: string;
  aspect: string;
  name: string;
  className?: string;
  showBadge?: boolean;
}) {
  if (isAllowedImageUrl(imagePath)) {
    return <AiImage url={imagePath} alt={name} aspect={aspect} className={className} />;
  }
  return <DemoArt seed={seed} style={style} mood={mood} aspect={aspect} className={className} label={showBadge} />;
}
