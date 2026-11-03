import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Pay-safe generation. Every paid AI call goes through runPaidJob:
 *
 *   1. start_paid_job   — refuses if the AI service is paused (nothing charged),
 *                         otherwise charges credits and creates the job atomically.
 *   2. work()           — the actual AI call.
 *   3. finish_paid_job  — on success.
 *      fail_paid_job    — on ANY error: full automatic refund, exactly once.
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
  model: string; // white-labelled id, e.g. "av-video-1"
  input: Record<string, unknown>;
  credits: number;
  requestKey: string; // from the form, so double-clicks never double-charge
};

export type PaidJobResult<T> =
  | { ok: true; jobId: string; value: T }
  | { ok: false; code: "insufficient_credits" | "service_unavailable" | "not_found" | "failed"; jobId?: string; refunded?: number };

type Rpc = (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;

function defaultRpc(): Rpc {
  const admin = createAdminClient();
  return async (fn, args) => {
    const { data, error } = await admin.rpc(fn, args);
    return { data, error: error ? { message: error.message } : null };
  };
}

const KNOWN = ["insufficient_credits", "service_unavailable", "not_found"] as const;

export async function runPaidJob<T>(
  job: PaidJobInput,
  work: (jobId: string) => Promise<{ value: T; output: Record<string, unknown>; providerRequestId?: string }>,
  rpc: Rpc = defaultRpc(),
): Promise<PaidJobResult<T>> {
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
  const jobId = started.data as string;

  try {
    const result = await work(jobId);
    const done = await rpc("finish_paid_job", {
      p_job_id: jobId,
      p_output: result.output,
      p_provider_request_id: result.providerRequestId ?? null,
    });
    if (done.error) throw new Error("could not record result");
    return { ok: true, jobId, value: result.value };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown error";
    // Retry the refund a few times; the scheduled safety net covers the rest.
    for (let attempt = 0; attempt < 3; attempt++) {
      const refund = await rpc("fail_paid_job", { p_job_id: jobId, p_error: reason }).catch(() => null);
      if (refund && !refund.error) return { ok: false, code: "failed", jobId, refunded: refund.data as number };
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }
    return { ok: false, code: "failed", jobId };
  }
}

/** Plain-language messages for the UI. No vendor names. */
export function paidJobMessage(code: Exclude<PaidJobResult<unknown>, { ok: true }>["code"], refunded?: number) {
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
