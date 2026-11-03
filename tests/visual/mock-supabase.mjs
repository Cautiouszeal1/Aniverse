// Test harness ONLY: a small in-memory imitation of Supabase's REST + Auth
// endpoints, so dashboard flows can be exercised end-to-end and screenshotted
// without a real project. Row-level security itself is tested separately
// against real Postgres in tests/db. Never used by the app at runtime.
import http from "node:http";
import { randomUUID } from "node:crypto";

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
};

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
  generation_jobs: () => ({ id: randomUUID(), status: "queued", created_at: now(), updated_at: now() }),
  characters: () => ({ id: randomUUID(), created_at: now(), updated_at: now() }),
  character_versions: () => ({ id: randomUUID(), created_at: now() }),
  projects: () => ({ id: randomUUID(), status: "active", created_at: now(), updated_at: now() }),
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  let body = "";
  for await (const chunk of req) body += chunk;
  const send = (status, payload, headers = {}) => {
    res.writeHead(status, { "content-type": "application/json", ...headers });
    res.end(payload === undefined ? "" : JSON.stringify(payload));
  };
  const p = url.pathname;

  if (p === "/auth/v1/user") return send(200, user);
  if (p === "/rest/v1/rpc/my_credit_balance")
    return send(200, db.credit_ledger.reduce((s, r) => s + r.delta, 0));

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
  if (req.method === "GET") return reply(applyFilters(db[table], url.searchParams));
  if (req.method === "POST") {
    const items = [].concat(JSON.parse(body || "[]"));
    const created = [];
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
