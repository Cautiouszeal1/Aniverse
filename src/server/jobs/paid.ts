import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Pay-safe generation. Every paid AI call goes through these steps:
 *
 *   1. startPaidJob    — refuses if the AI service is paused (nothing charged),
 *                        otherwise charges credits and creates the job atomically.
 *   2. the AI call     — inline (runPaidJob) or in the background (animations).
 *   3. completePaidJob — on success.
 *      failPaidJob     — on ANY error: full automatic refund, exactly once.
 *
 * If the server dies between 1 and 3, refund_stuck_jobs (scheduled every
 * minute) refunds the job. So a user either gets a result or their credits back.
 */

export type PaidJobInput = {
  userId: string;
  projectId: string;
  kind: "character_image" | "scene_image" | "scene_video";
  service: "image" | "video";
  provider: string; // white-labelled id, e.g. "aniverse-video"
  model: string; // white-labelled id, e.g. "av-motion-1"
  input: Record<string, unknown>;
  credits: number;
  requestKey: string; // from the form, so double-clicks never double-charge
};

export type PaidJobFailure = "insufficient_credits" | "service_unavailable" | "not_found" | "failed";

export type PaidJobResult<T> =
  | { ok: true; jobId: string; value: T }
  | { ok: false; code: PaidJobFailure; jobId?: string; refunded?: number };

export type Rpc = (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;

export function adminRpc(): Rpc {
  const admin = createAdminClient();
  return async (fn, args) => {
    const { data, error } = await admin.rpc(fn, args);
    return { data, error: error ? { message: error.message } : null };
  };
}

const KNOWN = ["insufficient_credits", "service_unavailable", "not_found"] as const;

export async function startPaidJob(
  job: PaidJobInput,
  rpc: Rpc = adminRpc(),
): Promise<{ ok: true; jobId: string } | { ok: false; code: PaidJobFailure }> {
  const started = await rpc("start_paid_job", {
    p_user_id: job.userId,
    p_project_id: job.projectId,
    p_kind: job.kind,
    p_service: job.service,
    p_provider: job.provider,
    p_model: job.model,
    p_input: job.input,
    p_credits: job.credits,
    p_key: job.requestKey,
  });
  if (started.error) {
    const code = KNOWN.find((k) => started.error!.message.includes(k));
    return { ok: false, code: code ?? "failed" };
  }
  return { ok: true, jobId: started.data as string };
}

export async function completePaidJob(
  jobId: string,
  output: Record<string, unknown>,
  providerRequestId?: string,
  rpc: Rpc = adminRpc(),
) {
  const done = await rpc("finish_paid_job", {
    p_job_id: jobId,
    p_output: output,
    p_provider_request_id: providerRequestId ?? null,
  });
  if (done.error) throw new Error("could not record result");
}

/** Refund with retries; the scheduled safety net covers anything left. */
export async function failPaidJob(jobId: string, reason: string, rpc: Rpc = adminRpc()): Promise<number | undefined> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const refund = await rpc("fail_paid_job", { p_job_id: jobId, p_error: reason }).catch(() => null);
    if (refund && !refund.error) return refund.data as number;
    await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
  }
  return undefined;
}

export async function runPaidJob<T>(
  job: PaidJobInput,
  work: (jobId: string) => Promise<{ value: T; output: Record<string, unknown>; providerRequestId?: string }>,
  rpc: Rpc = adminRpc(),
): Promise<PaidJobResult<T>> {
  const started = await startPaidJob(job, rpc);
  if (!started.ok) return started;
  const { jobId } = started;
  try {
    const result = await work(jobId);
    await completePaidJob(jobId, result.output, result.providerRequestId, rpc);
    return { ok: true, jobId, value: result.value };
  } catch (err) {
    const refunded = await failPaidJob(jobId, err instanceof Error ? err.message : "unknown error", rpc);
    return refunded === undefined ? { ok: false, code: "failed", jobId } : { ok: false, code: "failed", jobId, refunded };
  }
}

/** Plain-language messages for the UI. No vendor names. */
export function paidJobMessage(code: PaidJobFailure, refunded?: number) {
  switch (code) {
    case "insufficient_credits":
      return "You don't have enough credits for this. Top up on the Credits page.";
    case "service_unavailable":
      return "AniVerse AI is briefly unavailable. You have not been charged — please try again shortly.";
    case "not_found":
      return "That project could not be found.";
    default:
      return refunded
        ? `Something went wrong, so your ${refunded} credits were returned automatically.`
        : "Something went wrong. Any credits used are returned automatically within a few minutes.";
  }
}
