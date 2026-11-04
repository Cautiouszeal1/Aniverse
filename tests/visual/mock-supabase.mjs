// Test harness ONLY: a small in-memory imitation of Supabase's REST + Auth
// endpoints, so dashboard flows can be exercised end-to-end and screenshotted
// without a real project. Row-level security itself is tested separately
// against real Postgres in tests/db. Never used by the app at runtime.
import http from "node:http";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
const FIXTURE = readFileSync(new URL("./fixture.png", import.meta.url));
const FIXTURE_MP4 = readFileSync(new URL("./fixture.mp4", import.meta.url));
const storage = new Map(); // "bucket/path" -> {bytes, type}

const USER_ID = "11111111-1111-1111-1111-111111111111";
const user = { id: USER_ID, email: "ada@example.com", aud: "authenticated", role: "authenticated" };
const now = () => new Date().toISOString();

const db = {
  profiles: [{ id: USER_ID, display_name: "Ada Obi", creator_type: "independent_animator", onboarded_at: process.env.MOCK_ONBOARDED === "0" ? null : now() }],
  projects: [
    { id: "aaaaaaaa-0000-4000-8000-000000000001", owner_id: USER_ID, title: "The Lantern Keeper", description: "A girl who guards the last light in a drowned city.", status: "active", created_at: "2026-11-01T10:00:00Z", updated_at: "2026-11-03T09:00:00Z" },
    { id: "aaaaaaaa-0000-4000-8000-000000000002", owner_id: USER_ID, title: "Orbit Street", description: null, status: "active", created_at: "2026-10-28T10:00:00Z", updated_at: "2026-11-02T12:00:00Z" },
  ],
  credit_packs: [{ id: "starter", name: "Starter", price_usd_cents: 1000, credits: 500, sort_order: 1, active: true }],
  credit_ledger: [],
  generation_jobs: [],
  characters: [],
  character_versions: [],
  storyboards: [],
  storyboard_scenes: [],
  storyboard_revisions: [],
  payment_settings: [{ id: true, chain: "base", chain_id: 8453, token_symbol: "USDC", token_address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", token_decimals: 6, receive_address: "0x14a15a119f2bec1f09cc6261050ded87db3ddd38", order_minutes: 60, confirmations: 2, enabled: true }],
  crypto_orders: [],
  crypto_payments: [],
  crypto_scan_state: [],
  app_admins: [{ user_id: USER_ID }],
  animation_clips: [],
  ai_prices: [
    { id: "motion-standard", label: "Standard", description: "Fast, good-looking motion. Starts from your character's picture.", credits_per_clip: 100, max_seconds: 5, enabled: true, sort_order: 1 },
    { id: "motion-pro", label: "Premium", description: "Cinematic quality with richer motion and lighting.", credits_per_clip: 750, max_seconds: 8, enabled: true, sort_order: 2 },
  ],
  ai_service_status: [
    { service: "image", paused: false, auto_paused: false, reason: null, balance_usd: null, min_balance_usd: 5, updated_at: now() },
    { service: "video", paused: false, auto_paused: false, reason: null, balance_usd: null, min_balance_usd: 5, updated_at: now() },
  ],
  content_reports: [],
  account_deletion_requests: [],
  audit_events: [],
};
const balanceOf = (uid) => db.credit_ledger.filter((r) => (r.user_id ?? USER_ID) === uid).reduce((s, r) => s + r.delta, 0);
function failJob(id, err) {
  const j = db.generation_jobs.find((x) => x.id === id);
  if (!j || j.status === "completed") return 0;
  const amt = j.charged_credits - (j.refunded_credits || 0);
  if (amt > 0 && !db.credit_ledger.some((r) => r.key === "refund:" + id)) db.credit_ledger.push({ id: db.credit_ledger.length + 1, user_id: j.owner_id, delta: amt, reason: "refund", note: err, key: "refund:" + id, created_at: now() });
  Object.assign(j, { status: "failed", error: err, refunded_credits: j.charged_credits, completed_at: now() });
  return Math.max(amt, 0);
}
function paidRpc(name, a) {
  if (name === "start_paid_job") {
    const ex = db.generation_jobs.find((j) => j.idempotency_key === a.p_key);
    if (ex) return [200, ex.id];
    if (db.ai_service_status.find((s) => s.service === a.p_service)?.paused) return [400, { message: "service_unavailable" }];
    if (balanceOf(a.p_user_id) < a.p_credits) return [400, { message: "insufficient_credits" }];
    const id = randomUUID();
    db.credit_ledger.push({ id: db.credit_ledger.length + 1, user_id: a.p_user_id, delta: -a.p_credits, reason: "generation", note: null, created_at: now() });
    db.generation_jobs.push({ id, owner_id: a.p_user_id, project_id: a.p_project_id, kind: a.p_kind, status: "processing", provider: a.p_provider, model: a.p_model, is_demo: false, input: a.p_input, output: null, estimated_credits: a.p_credits, charged_credits: a.p_credits, refunded_credits: 0, idempotency_key: a.p_key, error: null, created_at: now(), updated_at: now() });
    return [200, id];
  }
  if (name === "finish_paid_job") { const j = db.generation_jobs.find((x) => x.id === a.p_job_id); if (j && j.status === "processing") Object.assign(j, { status: "completed", output: a.p_output, completed_at: now() }); return [200, true]; }
  if (name === "fail_paid_job") return [200, failJob(a.p_job_id, a.p_error)];
  if (name === "create_animation_clip") {
    const ex = db.animation_clips.find((c) => c.job_id === a.p_job); if (ex) return [200, ex.id];
    const version = db.animation_clips.filter((c) => c.scene_id === a.p_scene).reduce((m, c) => Math.max(m, c.version), 0) + 1;
    const id = randomUUID();
    db.animation_clips.push({ id, owner_id: a.p_owner, project_id: a.p_project, scene_id: a.p_scene, job_id: a.p_job, version, quality: a.p_quality, prompt: a.p_prompt, duration_seconds: a.p_duration, aspect_ratio: a.p_aspect, is_demo: a.p_is_demo, video_path: null, bytes: null, created_at: now() });
    return [200, id];
  }
  if (name === "attach_clip_video") { const c = db.animation_clips.find((x) => x.job_id === a.p_job); if (c) Object.assign(c, { video_path: a.p_path, bytes: a.p_bytes }); return [200, null]; }
  if (name === "report_ai_balance") { const s = db.ai_service_status.find((x) => x.service === a.p_service); const low = a.p_balance_usd < s.min_balance_usd; Object.assign(s, { balance_usd: a.p_balance_usd, paused: low, auto_paused: low, reason: low ? "low_balance" : null }); return [200, !low]; }
  if (name === "set_ai_service_paused") { const s = db.ai_service_status.find((x) => x.service === a.p_service); Object.assign(s, { paused: a.p_paused, auto_paused: false, reason: a.p_paused ? "manual" : null, updated_at: now() }); return [200, null]; }
  if (name === "admin_usage_report") {
    const kinds = [...new Set(db.generation_jobs.map((j) => j.kind))];
    return [200, kinds.map((k) => { const js = db.generation_jobs.filter((j) => j.kind === k); return { kind: k, jobs: js.length, completed: js.filter((j) => j.status === "completed").length, failed: js.filter((j) => j.status === "failed").length, credits_charged: js.reduce((t, j) => t + (j.charged_credits || 0), 0), credits_refunded: js.reduce((t, j) => t + (j.refunded_credits || 0), 0) }; })];
  }
  if (name === "admin_find_users") return [200, [{ user_id: USER_ID, email: user.email, display_name: "Ada Obi", created_at: "2026-11-01T10:00:00Z", balance: balanceOf(USER_ID), projects: db.projects.length, jobs: db.generation_jobs.length }]];
  if (name === "admin_adjust_credits") {
    if (balanceOf(a.p_user_id) + a.p_delta < 0) return [400, { message: "would_go_negative" }];
    db.credit_ledger.push({ id: db.credit_ledger.length + 1, user_id: a.p_user_id, delta: a.p_delta, reason: "adjustment", note: a.p_note, created_at: now() });
    db.audit_events.push({ id: db.audit_events.length + 1, action: "credits.adjust", target_id: a.p_user_id, details: { delta: a.p_delta, note: a.p_note }, created_at: now() });
    return [200, balanceOf(a.p_user_id)];
  }
  return null;
}

// ---- Stand-in Base chain (test only) ----
const chain = { block: 1000, logs: [], blockTimes: new Map() };
setInterval(() => { chain.block++; chain.blockTimes.set(chain.block, Math.floor(Date.now() / 1000)); }, 1000);
const hex = (n) => "0x" + BigInt(n).toString(16);
const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const topicAddr = (a) => "0x" + a.toLowerCase().replace(/^0x/, "").padStart(64, "0");
function addTransfer({ to, units, token = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", from = "0x" + "7".repeat(40) }) {
  const txHash = "0x" + randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
  chain.block++; chain.blockTimes.set(chain.block, Math.floor(Date.now() / 1000));
  chain.logs.push({ address: token, topics: [TRANSFER, topicAddr(from), topicAddr(to)], data: "0x" + BigInt(units).toString(16).padStart(64, "0"), blockNumber: hex(chain.block), transactionHash: txHash, logIndex: "0x0", removed: false });
  return txHash;
}
function rpcHandle(m, params) {
  if (m === "eth_blockNumber") return hex(chain.block);
  if (m === "eth_getLogs") {
    const f = params[0]; const lo = Number(BigInt(f.fromBlock)); const hi = Number(BigInt(f.toBlock));
    return chain.logs.filter((l) => { const b = Number(BigInt(l.blockNumber)); return b >= lo && b <= hi && l.address === f.address.toLowerCase() && l.topics[2] === f.topics[2]; });
  }
  if (m === "eth_getBlockByNumber") { const n = Number(BigInt(params[0])); return { number: params[0], timestamp: hex(chain.blockTimes.get(n) ?? Math.floor(Date.now() / 1000)) }; }
  if (m === "eth_getTransactionReceipt") { const ls = chain.logs.filter((l) => l.transactionHash === params[0]); return ls.length ? { status: "0x1", blockNumber: ls[0].blockNumber, logs: ls } : null; }
  if (m === "eth_requestAccounts" || m === "eth_accounts") return ["0x" + "7".repeat(40)];
  return null;
}
const now2 = () => new Date().toISOString();
function confirmPayment(a) {
  if (db.crypto_payments.some((x) => x.tx_hash === a.p_tx_hash && x.log_index === a.p_log_index)) return "duplicate";
  const pay = { id: randomUUID(), chain: a.p_chain, tx_hash: a.p_tx_hash, log_index: a.p_log_index, from_address: a.p_from, units: String(a.p_units), status: "unmatched", created_at: now2(), order_id: null };
  db.crypto_payments.push(pay);
  const o = db.crypto_orders.filter((x) => String(x.amount_units) === String(a.p_units) && ["pending", "expired"].includes(x.status) && new Date(x.created_at).getTime() <= new Date(a.p_block_time).getTime() + 120000)[0];
  if (!o) return "unmatched";
  Object.assign(o, { status: "paid", tx_hash: a.p_tx_hash, from_address: a.p_from, paid_at: now2() });
  pay.status = "credited"; pay.order_id = o.id;
  db.credit_ledger.push({ id: db.credit_ledger.length + 1, user_id: o.owner_id, delta: o.credits, reason: "purchase", note: o.credits + " credits · USDC payment", created_at: now2() });
  return "credited";
}

function applyFilters(rows, params) {
  let out = rows;
  for (const [k, v] of params) {
    if (["select", "order", "limit", "offset", "columns"].includes(k)) continue;
    const [op, ...rest] = v.split(".");
    const val = rest.join(".");
    if (op === "eq") out = out.filter((r) => String(r[k]) === val);
    else if (op === "in") {
      const set = val.replace(/^\(|\)$/g, "").split(",").map((s) => s.replace(/^"|"$/g, ""));
      out = out.filter((r) => set.includes(String(r[k])));
    } else if (op === "gte") out = out.filter((r) => String(r[k]) >= val);
  }
  const order = params.get("order");
  if (order) {
    const [col, dir] = order.split(".");
    out = [...out].sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (dir === "desc" ? -1 : 1));
  }
  const limit = Number(params.get("limit") || 0);
  if (limit) out = out.slice(0, limit);
  return out;
}

const defaults = {
  generation_jobs: () => ({ id: randomUUID(), status: "queued", refunded_credits: 0, created_at: now(), updated_at: now() }),
  content_reports: () => ({ id: randomUUID(), status: "open", admin_note: null, created_at: now(), updated_at: now() }),
  account_deletion_requests: () => ({ status: "pending", requested_at: now(), updated_at: now() }),
  characters: () => ({ id: randomUUID(), created_at: now(), updated_at: now() }),
  character_versions: () => ({ id: randomUUID(), created_at: now() }),
  projects: () => ({ id: randomUUID(), status: "active", created_at: now(), updated_at: now() }),
  storyboards: () => ({ id: randomUUID(), title: "Storyboard", created_at: now(), updated_at: now() }),
  storyboard_scenes: () => ({ id: randomUUID(), title: "", description: "", dialogue: "", shot_type: "medium", camera_notes: "", duration_seconds: 4, character_ids: [], created_at: now(), updated_at: now() }),
  storyboard_revisions: () => ({ id: randomUUID(), created_at: now() }),
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks);
  const body = raw.toString("binary");
  const send = (status, payload, headers = {}) => {
    res.writeHead(status, { "content-type": "application/json", ...headers });
    res.end(payload === undefined ? "" : JSON.stringify(payload));
  };
  const p = url.pathname;

  // Stand-in for the Pollinations image endpoint (test only).
  if (p.startsWith("/prompt/")) {
    globalThis.__imgHits = (globalThis.__imgHits || 0) + 1;
    const seed = Number(url.searchParams.get("seed") || 1);
    const hue = seed % 360;
    const w = url.searchParams.get("width"), h = url.searchParams.get("height");
    await new Promise((r) => setTimeout(r, 700));
    res.writeHead(200, { "content-type": "image/svg+xml", "access-control-allow-origin": "*" });
    return res.end(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},70%,45%)"/><stop offset="1" stop-color="hsl(${(hue+80)%360},70%,25%)"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="50%" cy="40%" r="18%" fill="hsl(${(hue+40)%360},80%,75%)"/><rect x="35%" y="55%" width="30%" height="35%" rx="20" fill="hsl(${(hue+40)%360},60%,60%)"/><text x="50%" y="96%" text-anchor="middle" font-size="22" fill="#fff" font-family="sans-serif">AI image stand-in · seed ${seed}</text></svg>`);
  }
  if (p === "/__hits") return send(200, { hits: globalThis.__imgHits || 0, keyed: globalThis.__keyed || 0, stored: storage.size });

  // Stand-in for gen.pollinations.ai keyed image API (test only).
  if (p.startsWith("/image/") && ["seedance", "veo"].includes(url.searchParams.get("model"))) {
    if (req.headers.authorization !== "Bearer sk_test_key") return send(401, { error: "bad key" });
    globalThis.__video = (globalThis.__video || 0) + 1;
    globalThis.__lastVideo = Object.fromEntries(url.searchParams);
    if (globalThis.__videoMode === "fail") { await new Promise((r) => setTimeout(r, 500)); return send(500, { error: "engine down" }); }
    if (globalThis.__videoMode === "broke") return send(402, { error: "insufficient pollen" });
    await new Promise((r) => setTimeout(r, 2500));
    res.writeHead(200, { "content-type": "video/mp4" });
    return res.end(FIXTURE_MP4);
  }
  if (p === "/__video_mode") { globalThis.__videoMode = url.searchParams.get("m"); return send(200, { ok: true }); }
  if (p === "/__db") return send(200, { jobs: db.generation_jobs, clips: db.animation_clips, ledger: db.credit_ledger, status: db.ai_service_status, reports: db.content_reports, deletions: db.account_deletion_requests });
  if (p === "/__video") return send(200, { calls: globalThis.__video || 0, last: globalThis.__lastVideo || null });
  if (p.startsWith("/image/")) {
    if (req.headers.authorization !== "Bearer sk_test_key") return send(401, { error: "bad key" });
    globalThis.__keyed = (globalThis.__keyed || 0) + 1;
    await new Promise((r) => setTimeout(r, 400));
    res.writeHead(200, { "content-type": "image/png" });
    return res.end(FIXTURE);
  }

  // Stand-in for Supabase Storage (test only).
  const so = p.match(/^\/storage\/v1\/object\/(sign\/)?([^/]+)\/?(.*)$/);
  if (so) {
    const [, sign, bucket, objPath] = so;
    const key = `${bucket}/${decodeURIComponent(objPath)}`;
    if (sign && req.method === "POST" && !objPath) {
      const { paths } = JSON.parse(body || "{}");
      return send(200, paths.map((path) => storage.has(`${bucket}/${path}`)
        ? { path, signedURL: `/object/sign/${bucket}/${path}?token=t`, error: null }
        : { path, signedURL: null, error: "Either the object does not exist or you do not have access to it" }));
    }
    if (sign && req.method === "POST") {
      if (!storage.has(key)) return send(400, { statusCode: "404", error: "not_found", message: "Object not found" });
      return send(200, { signedURL: `/object/sign/${key}?token=t` });
    }
    if (sign && req.method === "GET") {
      const obj = storage.get(key);
      if (!obj) return send(404, {});
      res.writeHead(200, { "content-type": obj.type });
      return res.end(obj.bytes);
    }
    if (req.method === "POST") {
      if (storage.has(key) && req.headers["x-upsert"] !== "true") return send(400, { statusCode: "409", error: "Duplicate", message: "The resource already exists" });
      storage.set(key, { bytes: raw, type: req.headers["content-type"] || "application/octet-stream" });
      return send(200, { Key: key, Id: randomUUID() });
    }
  }
  if (p === "/auth/v1/user") return send(200, user);
  if (p === "/rest/v1/rpc/my_credit_balance")
    return send(200, db.credit_ledger.reduce((s, r) => s + r.delta, 0));

  if (p === "/__chain/pay") { const q = Object.fromEntries(url.searchParams); return send(200, { tx: addTransfer({ to: q.to ?? "0x14a15a119f2bec1f09cc6261050ded87db3ddd38", units: q.units, token: q.token }) }); }
  if (p.startsWith("/__chain/") && req.method === "OPTIONS") {
    res.writeHead(204, { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "POST, GET" });
    return res.end();
  }
  if (p === "/__chain/rpc" || p === "/__chain/rpc/") {
    res.setHeader("access-control-allow-origin", "*");
    const b = JSON.parse(body || "{}");
    if (b.method === "eth_sendTransaction") {
      const tx = b.params[0]; const d = tx.data.slice(10);
      const to = "0x" + d.slice(24, 64); const units = BigInt("0x" + d.slice(64, 128));
      return send(200, { jsonrpc: "2.0", id: b.id, result: addTransfer({ to, units, token: tx.to.toLowerCase(), from: tx.from }) });
    }
    return send(200, { jsonrpc: "2.0", id: b.id, result: rpcHandle(b.method, b.params || []) });
  }
  if (p === "/rest/v1/rpc/create_crypto_order") {
    const { p_pack_id } = JSON.parse(body || "{}"); const pack = db.credit_packs.find((x) => x.id === p_pack_id);
    if (db.crypto_orders.filter((o) => o.status === "pending").length >= 3) return send(400, { message: "too_many_open_orders" });
    const o = { id: randomUUID(), owner_id: USER_ID, pack_id: pack.id, credits: pack.credits, price_usd_cents: pack.price_usd_cents, chain: "base", chain_id: 8453, token_symbol: "USDC", token_address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", token_decimals: 6, receive_address: "0x14a15a119f2bec1f09cc6261050ded87db3ddd38", amount_units: 10000000 + 1 + Math.floor(Math.random() * 9999), status: "pending", tx_hash: null, created_at: now2(), expires_at: new Date(Date.now() + 3600e3).toISOString() };
    db.crypto_orders.push(o); return send(200, o);
  }
  if (p === "/rest/v1/rpc/confirm_crypto_payment") return send(200, confirmPayment(JSON.parse(body || "{}")));
  if (p === "/rest/v1/rpc/expire_crypto_orders") return send(200, 0);
  if (p === "/rest/v1/rpc/is_admin") return send(200, true);
  if (p === "/rest/v1/rpc/cancel_crypto_order") { const { p_order_id } = JSON.parse(body || "{}"); const o = db.crypto_orders.find((x) => x.id === p_order_id); if (o && o.status === "pending") o.status = "cancelled"; return send(200, null); }
  if (p === "/rest/v1/rpc/resolve_crypto_payment") {
    const { p_payment_id, p_order_id } = JSON.parse(body || "{}");
    const pay = db.crypto_payments.find((x) => x.id === p_payment_id); const o = db.crypto_orders.find((x) => x.id === p_order_id);
    Object.assign(o, { status: "paid", tx_hash: pay.tx_hash, paid_at: now2() }); pay.status = "resolved"; pay.order_id = o.id;
    db.credit_ledger.push({ id: db.credit_ledger.length + 1, user_id: o.owner_id, delta: o.credits, reason: "purchase", note: "resolved", created_at: now2() });
    return send(200, null);
  }
  if (p === "/rest/v1/rpc/reorder_scenes") {
    const { p_storyboard_id, p_scene_ids } = JSON.parse(body || "{}");
    const scenes = db.storyboard_scenes.filter((x) => x.storyboard_id === p_storyboard_id);
    if (scenes.length !== p_scene_ids.length) return send(400, { message: "scene_list_mismatch" });
    p_scene_ids.forEach((id, i) => { const sc = scenes.find((x) => x.id === id); if (sc) sc.position = i; });
    return send(200, null);
  }
  if (p === "/rest/v1/rpc/restore_storyboard_revision") {
    const { p_revision_id } = JSON.parse(body || "{}");
    const rev = db.storyboard_revisions.find((r) => r.id === p_revision_id);
    if (!rev) return send(400, { message: "not_found" });
    db.storyboard_scenes = db.storyboard_scenes.filter((x) => x.storyboard_id !== rev.storyboard_id);
    rev.scenes.forEach((sc, i) => db.storyboard_scenes.push({ ...defaults.storyboard_scenes(), ...sc, storyboard_id: rev.storyboard_id, owner_id: USER_ID, position: i }));
    return send(200, rev.scenes.length);
  }
  const rp = p.match(/^\/rest\/v1\/rpc\/(\w+)$/);
  if (rp) { const r = paidRpc(rp[1], JSON.parse(body || "{}")); if (r) return send(r[0], r[1]); }
  const m = p.match(/^\/rest\/v1\/(\w+)$/);
  if (!m || !db[m[1]]) return send(404, {});
  const table = m[1];
  const wantsObject = (req.headers.accept || "").includes("vnd.pgrst.object");
  const prefer = req.headers.prefer || "";

  const reply = (rows) => {
    if (wantsObject) {
      if (rows.length !== 1) return send(406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned", details: `The result contains ${rows.length} rows`, hint: null });
      return send(200, rows[0]);
    }
    return send(200, rows);
  };

  if (req.method === "HEAD" || (req.method === "GET" && prefer.includes("count=exact") && url.searchParams.get("select") === "id")) {
    const rows = applyFilters(db[table], url.searchParams);
    res.writeHead(200, { "content-range": `0-${Math.max(rows.length - 1, 0)}/${rows.length}` });
    return res.end(req.method === "HEAD" ? "" : JSON.stringify(rows));
  }
  if (req.method === "GET") {
    let rows = applyFilters(db[table], url.searchParams);
    if (table === "animation_clips") rows = rows.map((c) => ({ ...c, generation_jobs: (({ status, charged_credits, refunded_credits }) => ({ status, charged_credits, refunded_credits }))(db.generation_jobs.find((j) => j.id === c.job_id) ?? {}) }));
    if (table === "storyboard_scenes") rows = rows.map((sc) => ({ ...sc, storyboards: { project_id: db.storyboards.find((b) => b.id === sc.storyboard_id)?.project_id } }));
    return reply(rows);
  }
  if (req.method === "POST") {
    const items = [].concat(JSON.parse(body || "[]"));
    const created = [];
    if (prefer.includes("merge-duplicates") && table === "crypto_scan_state") {
      for (const item of items) { const ex = db.crypto_scan_state.find((r) => r.chain === item.chain); if (ex) Object.assign(ex, item); else db.crypto_scan_state.push(item); }
      return send(201, undefined);
    }
    for (const item of items) {
      if (table === "generation_jobs" && db.generation_jobs.some((j) => j.idempotency_key === item.idempotency_key))
        return send(409, { code: "23505", message: "duplicate key" });
      if (table === "character_versions" && db.character_versions.some((v) => v.character_id === item.character_id && v.version === item.version))
        return send(409, { code: "23505", message: "duplicate key" });
      const row = { ...(defaults[table]?.() ?? {}), ...item };
      db[table].push(row);
      created.push(row);
      if (table === "character_versions") {
        const c = db.characters.find((c) => c.id === row.character_id);
        if (c) c.updated_at = now();
      }
    }
    if (prefer.includes("return=representation")) return reply(created);
    return send(201, undefined);
  }
  if (req.method === "PATCH") {
    const patch = JSON.parse(body || "{}");
    const rows = applyFilters(db[table], url.searchParams);
    for (const r of rows) Object.assign(r, patch, "updated_at" in r ? { updated_at: now() } : {});
    return prefer.includes("return=representation") ? reply(rows) : send(204, undefined);
  }
  if (req.method === "DELETE") {
    const rows = applyFilters(db[table], url.searchParams);
    db[table] = db[table].filter((r) => !rows.includes(r));
    if (table === "characters") db.character_versions = db.character_versions.filter((v) => !rows.some((r) => r.id === v.character_id));
    return send(204, undefined);
  }
  send(405, {});
}).listen(54321, () => console.log("mock supabase on :54321"));
