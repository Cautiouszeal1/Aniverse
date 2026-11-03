import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { IMAGE_BUCKET, isStoragePath } from "@/lib/images/paths";

type Supa = Awaited<ReturnType<typeof createClient>>;

const SIGNED_URL_SECONDS = 60 * 60; // 1 hour

export function jobImagePath(userId: string, jobId: string, seed: string) {
  return `${userId}/${jobId}/${seed}.jpg`;
}

/** Signed URL for one private image, or null if it doesn't exist / isn't ours. */
export async function signedUrlFor(supabase: Supa, path: string) {
  if (!isStoragePath(path)) return null;
  const { data, error } = await supabase.storage.from(IMAGE_BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/** Signed URLs for many images at once (missing ones are left out). */
export async function signedUrlsFor(supabase: Supa, paths: string[]) {
  const valid = [...new Set(paths.filter(isStoragePath))];
  const map = new Map<string, string>();
  if (!valid.length) return map;
  const { data } = await supabase.storage.from(IMAGE_BUCKET).createSignedUrls(valid, SIGNED_URL_SECONDS);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl && !item.error) map.set(item.path, item.signedUrl);
  }
  return map;
}

export async function uploadImage(supabase: Supa, path: string, bytes: ArrayBuffer, contentType: string) {
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, bytes, { contentType, upsert: false, cacheControl: "31536000" });
  // Already uploaded by an earlier attempt: treat as success.
  if (error && !/exists|duplicate/i.test(error.message)) throw new Error("Couldn't save the image");
}
