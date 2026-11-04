import "server-only";

const SHOT_TEXT: Record<string, string> = {
  wide: "wide establishing shot",
  medium: "medium shot",
  "close-up": "close-up shot",
  "extreme-close-up": "extreme close-up",
  "over-the-shoulder": "over-the-shoulder shot",
  aerial: "aerial shot",
  pov: "first-person point-of-view shot",
};

export type PromptScene = {
  title: string;
  description: string;
  dialogue: string;
  shot_type: string;
  camera_notes: string;
};

export type PromptCharacter = { name: string; look: string };

/**
 * Turns a storyboard scene into one clear video prompt. Dialogue is used as
 * acting direction (the clip itself is silent), and characters keep the look
 * they were designed with.
 */
export function buildScenePrompt(scene: PromptScene, characters: PromptCharacter[], extra = "") {
  const parts: string[] = [];
  const action = scene.description.trim() || scene.title.trim();
  if (action) parts.push(action);
  if (characters.length) {
    parts.push(
      "Characters: " +
        characters
          .map((c) => (c.look ? `${c.name} (${c.look.slice(0, 160)})` : c.name))
          .join("; "),
    );
  }
  if (scene.dialogue.trim()) parts.push(`Acting: they speak — "${scene.dialogue.trim().slice(0, 200)}"`);
  parts.push(SHOT_TEXT[scene.shot_type] ?? "cinematic shot");
  if (scene.camera_notes.trim()) parts.push(`Camera: ${scene.camera_notes.trim()}`);
  if (extra.trim()) parts.push(extra.trim());
  parts.push("animated film style, smooth natural motion, consistent characters, no text, no watermark");
  return parts.join(". ").replace(/\s+/g, " ").slice(0, 1800);
}
