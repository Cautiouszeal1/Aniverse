import { test } from "node:test";
import assert from "node:assert/strict";
import { clipDurationFor, isVideoPath } from "../../src/lib/animation/options";
import { buildScenePrompt } from "../../src/lib/animation/prompt";
import { renderVideo, videoUrl, VideoError } from "../../src/server/providers/video";

process.env.POLLINATIONS_API_KEY = "sk_test";

const req = {
  quality: "motion-standard" as const,
  prompt: "Ada waves at the camera",
  durationSeconds: 5,
  aspect: "16:9" as const,
  seed: 42,
  startImageUrl: "https://files.example/ada.jpg?token=abc",
};

test("prompt uses scene, characters, acting and camera", () => {
  const p = buildScenePrompt(
    { title: "Hello", description: "Ada waves from the rooftop", dialogue: "Hi there!", shot_type: "close-up", camera_notes: "slow push in" },
    [{ name: "Ada", look: "girl with red scarf" }],
    "sunset light",
  );
  assert.match(p, /Ada waves from the rooftop/);
  assert.match(p, /Ada \(girl with red scarf\)/);
  assert.match(p, /Hi there!/);
  assert.match(p, /close-up shot/);
  assert.match(p, /slow push in/);
  assert.match(p, /sunset light/);
  assert.ok(p.length <= 1800);
});

test("duration snaps to what the quality supports", () => {
  assert.equal(clipDurationFor("motion-standard", 12, 5), 5);
  assert.equal(clipDurationFor("motion-standard", 3.2, 5), 3);
  assert.equal(clipDurationFor("motion-pro", 7, 8), 6);
  assert.equal(clipDurationFor("motion-pro", 10, 8), 8);
});

test("video paths are strict", () => {
  assert.ok(isVideoPath("00000000-0000-0000-0000-000000000001/00000000-0000-0000-0000-000000000002.mp4"));
  assert.ok(!isVideoPath("../etc/passwd.mp4"));
  assert.ok(!isVideoPath("a/b/c.mp4"));
});

test("engine request carries model, length, shape and start frame", () => {
  const u = new URL(videoUrl(req));
  assert.equal(u.searchParams.get("model"), "seedance");
  assert.equal(u.searchParams.get("duration"), "5");
  assert.equal(u.searchParams.get("aspectRatio"), "16:9");
  assert.equal(u.searchParams.get("image"), req.startImageUrl);
  assert.equal(new URL(videoUrl({ ...req, quality: "motion-pro" })).searchParams.get("model"), "veo");
});

function fakeFetch(status: number, type: string, size: number) {
  return (async () => new Response(new Uint8Array(size), { status, headers: { "content-type": type } })) as typeof fetch;
}

test("a good video comes back as bytes", async () => {
  const r = await renderVideo(req, fakeFetch(200, "video/mp4", 50_000));
  assert.equal(r.contentType, "video/mp4");
  assert.equal(r.bytes.byteLength, 50_000);
});

test("out of funds is flagged so the service pauses", async () => {
  await assert.rejects(renderVideo(req, fakeFetch(402, "application/json", 10)), (e: VideoError) => e.outOfFunds === true);
});

test("errors and wrong content are rejected", async () => {
  await assert.rejects(renderVideo(req, fakeFetch(500, "text/plain", 10)), (e: VideoError) => !e.outOfFunds);
  await assert.rejects(renderVideo(req, fakeFetch(200, "image/jpeg", 50_000)), /unexpected result type/);
  await assert.rejects(renderVideo(req, fakeFetch(200, "video/mp4", 100)), /unexpected result size/);
});
