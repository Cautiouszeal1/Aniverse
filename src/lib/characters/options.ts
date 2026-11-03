/** Options shown in Character Studio. Shared by client and server. */

export const STYLES = [
  { id: "3d-animated", label: "3D animated" },
  { id: "2d-cartoon", label: "2D cartoon" },
  { id: "anime", label: "Anime-inspired" },
  { id: "storybook", label: "Watercolour storybook" },
  { id: "claymation", label: "Clay / stop-motion" },
  { id: "pixel", label: "Pixel art" },
] as const;

export const MOODS = [
  { id: "heroic", label: "Heroic" },
  { id: "playful", label: "Playful" },
  { id: "mysterious", label: "Mysterious" },
  { id: "gentle", label: "Gentle" },
  { id: "fierce", label: "Fierce" },
] as const;

export const ASPECTS = [
  { id: "1:1", label: "Square 1:1" },
  { id: "3:4", label: "Portrait 3:4" },
  { id: "16:9", label: "Wide 16:9" },
] as const;

export type StyleId = (typeof STYLES)[number]["id"];
export type MoodId = (typeof MOODS)[number]["id"];
export type AspectId = (typeof ASPECTS)[number]["id"];

export const VARIATIONS_PER_GENERATION = 4;

export const PROMPT_EXAMPLES = [
  "A brave girl with braided hair who carries a glowing lantern through a flooded city",
  "A retired robot gardener with moss growing on his shoulders",
  "A tiny fox courier with a satchel full of letters and a red scarf",
  "A street drummer from Lagos whose rhythms make the city lights dance",
];

export function labelFor(list: readonly { id: string; label: string }[], id: string) {
  return list.find((x) => x.id === id)?.label ?? id;
}
