import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { IMAGE_BUCKET, isStoragePath } from "@/lib/images/paths";
import type { QualityId } from "@/lib/animation/options";
import { completePaidJob, failPaidJob, adminRpc } from "@/server/jobs/paid";
import { renderVideo, VideoError } from "@/server/providers/video";
import { clipVideoPath, uploadVideo } from "./storage";

export type ClipJobInput = {
  quality: QualityId;
  prompt: string;
  durationSeconds: number;
  aspect: "16:9" | "9:16";
  seed: number;
  startImagePath: string | null;
};

/**
 * Runs in the background after the user's request has returned, so it keeps
 * going even if they close the page or their phone goes off. Always ends in
 * "completed" (video saved) or "failed" (credits refunded).
 */
export async function renderClipJob(jobId: string, deps = { render: renderVideo }) {
  const admin = createAdminClient();
  const rpc = adminRpc();

  const { data: job } = await admin
    .from("generation_jobs")
    .select("id, owner_id, status, input, charged_credits")
    .eq("id", jobId)
    .maybeSingle();
  if (!job || job.status !== "processing") return;
  const input = job.input as ClipJobInput;

  try {
    let startImageUrl: string | null = null;
    if (isStoragePath(input.startImagePath) && input.startImagePath.startsWith(`${job.owner_id}/`)) {
      const { data } = await admin.storage.from(IMAGE_BUCKET).createSignedUrl(input.startImagePath, 20 * 60);
      startImageUrl = data?.signedUrl ?? null;
    }

    const request = {
      quality: input.quality,
      prompt: input.prompt,
      durationSeconds: input.durationSeconds,
      aspect: input.aspect,
      seed: input.seed,
      startImageUrl,
    };

    let result;
    const t0 = Date.now();
    try {
      result = await deps.render(request);
    } catch (err) {
      // One quick retry for a fast, temporary failure.
      if (err instanceof VideoError && !err.outOfFunds && Date.now() - t0 < 60_000) {
        await new Promise((r) => setTimeout(r, 3000));
        result = await deps.render(request);
      } else {
        throw err;
      }
    }

    const path = clipVideoPath(job.owner_id, job.id, result.contentType);
    await uploadVideo(path, result.bytes, result.contentType);
    const { error } = await admin.rpc("attach_clip_video", { p_job: job.id, p_path: path, p_bytes: result.bytes.byteLength });
    if (error) throw new Error("couldn't record the video");
    await completePaidJob(job.id, { video_path: path, bytes: result.bytes.byteLength }, undefined, rpc);
  } catch (err) {
    if (err instanceof VideoError && err.outOfFunds) {
      // Stop charging anyone else until the engine account is topped up.
      await admin.rpc("report_ai_balance", { p_service: "video", p_balance_usd: 0 });
      console.error("[ai-video] engine account needs funds — video paused automatically");
    }
    await failPaidJob(job.id, err instanceof Error ? err.message : "render failed", rpc);
  }
}
