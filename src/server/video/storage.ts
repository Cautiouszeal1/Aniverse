import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { VIDEO_BUCKET, isVideoPath } from "@/lib/animation/options";

type Supa = Awaited<ReturnType<typeof createClient>>;
const SIGNED_URL_SECONDS = 60 * 60;

export function clipVideoPath(userId: string, jobId: string, contentType: string) {
  return `${userId}/${jobId}.${contentType === "video/webm" ? "webm" : "mp4"}`;
}

/** Only the server writes videos (users have no upload permission). */
export async function uploadVideo(path: string, bytes: ArrayBuffer, contentType: string) {
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(VIDEO_BUCKET)
    .upload(path, bytes, { contentType, upsert: true, cacheControl: "31536000" });
  if (error) throw new Error("couldn't save the video");
}

/** Signed URLs (as the user, so RLS confirms ownership). Download variant forces a file save. */
export async function signedVideoUrls(supabase: Supa, paths: string[], download = false) {
  const valid = [...new Set(paths.filter(isVideoPath))];
  const map = new Map<string, string>();
  if (!valid.length) return map;
  if (download) {
    await Promise.all(
      valid.map(async (p) => {
        const { data } = await supabase.storage
          .from(VIDEO_BUCKET)
          .createSignedUrl(p, SIGNED_URL_SECONDS, { download: "aniverse-clip.mp4" });
        if (data?.signedUrl) map.set(p, data.signedUrl);
      }),
    );
    return map;
  }
  const { data } = await supabase.storage.from(VIDEO_BUCKET).createSignedUrls(valid, SIGNED_URL_SECONDS);
  for (const item of data ?? []) if (item.path && item.signedUrl && !item.error) map.set(item.path, item.signedUrl);
  return map;
}

export async function deleteVideo(supabase: Supa, path: string) {
  if (!isVideoPath(path)) return;
  await supabase.storage.from(VIDEO_BUCKET).remove([path]);
}
