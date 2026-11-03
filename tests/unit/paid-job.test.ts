import { test } from "node:test";
import assert from "node:assert/strict";
import { runPaidJob, paidJobMessage, type PaidJobInput } from "../../src/server/jobs/paid";

const job: PaidJobInput = {
  userId: "u", projectId: "p", kind: "scene_video", service: "video",
  provider: "aniverse-video", model: "av-video-1", input: {}, credits: 750, requestKey: "k",
};

function fakeRpc(overrides: Record<string, () => { data: unknown; error: { message: string } | null }> = {}) {
  const calls: string[] = [];
  const rpc = async (fn: string) => {
    calls.push(fn);
    if (overrides[fn]) return overrides[fn]();
    if (fn === "start_paid_job") return { data: "job-1", error: null };
    if (fn === "fail_paid_job") return { data: 750, error: null };
    return { data: true, error: null };
  };
  return { rpc, calls };
}

test("success: charges then finishes", async () => {
  const { rpc, calls } = fakeRpc();
  const r = await runPaidJob(job, async () => ({ value: "video.mp4", output: { url: "x" } }), rpc);
  assert.deepEqual(r, { ok: true, jobId: "job-1", value: "video.mp4" });
  assert.deepEqual(calls, ["start_paid_job", "finish_paid_job"]);
});

test("AI failure: refunds automatically", async () => {
  const { rpc, calls } = fakeRpc();
  const r = await runPaidJob(job, async () => { throw new Error("provider 500"); }, rpc);
  assert.deepEqual(r, { ok: false, code: "failed", jobId: "job-1", refunded: 750 });
  assert.deepEqual(calls, ["start_paid_job", "fail_paid_job"]);
  assert.match(paidJobMessage("failed", 750), /750 credits were returned/);
});

test("service paused: no work, no charge", async () => {
  const { rpc, calls } = fakeRpc({ start_paid_job: () => ({ data: null, error: { message: "service_unavailable" } }) });
  let ran = false;
  const r = await runPaidJob(job, async () => { ran = true; return { value: 1, output: {} }; }, rpc);
  assert.equal(ran, false);
  assert.deepEqual(r, { ok: false, code: "service_unavailable" });
  assert.deepEqual(calls, ["start_paid_job"]);
  assert.doesNotMatch(paidJobMessage("service_unavailable"), /venice|pollinations|fal/i);
});

test("insufficient credits is reported", async () => {
  const { rpc } = fakeRpc({ start_paid_job: () => ({ data: null, error: { message: "insufficient_credits" } }) });
  const r = await runPaidJob(job, async () => ({ value: 1, output: {} }), rpc);
  assert.deepEqual(r, { ok: false, code: "insufficient_credits" });
});

test("recording result fails: user is refunded, not left charged", async () => {
  const { rpc, calls } = fakeRpc({ finish_paid_job: () => ({ data: null, error: { message: "db down" } }) });
  const r = await runPaidJob(job, async () => ({ value: 1, output: {} }), rpc);
  assert.equal(r.ok, false);
  assert.ok(calls.includes("fail_paid_job"));
});
