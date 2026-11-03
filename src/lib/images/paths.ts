/** Private image storage (brand-neutral; safe to use in the browser). */
export const IMAGE_BUCKET = "character-images";

/** Storage paths look like "<user id>/<job id>/<seed>.jpg". */
export function isStoragePath(p: string | null | undefined): p is string {
  return typeof p === "string" && /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/\d+\.(jpg|png|webp)$/i.test(p);
}
