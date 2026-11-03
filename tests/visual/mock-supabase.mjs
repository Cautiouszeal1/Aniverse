// Visual-test harness ONLY: a tiny fake of the Supabase REST/Auth endpoints so
// the dashboard can be rendered and screenshotted without a real project.
// It is never used by the app at runtime.
import http from "node:http";

const user = { id: "11111111-1111-1111-1111-111111111111", email: "ada@example.com", aud: "authenticated", role: "authenticated" };
const projects = [
  { id: "p1", title: "The Lantern Keeper", description: "A girl who guards the last light in a drowned city.", status: "active", created_at: "2026-11-01T10:00:00Z", updated_at: "2026-11-03T09:00:00Z" },
  { id: "p2", title: "Orbit Street", description: null, status: "active", created_at: "2026-10-28T10:00:00Z", updated_at: "2026-11-02T12:00:00Z" },
  { id: "p3", title: "Old pilot test", description: null, status: "archived", created_at: "2026-10-20T10:00:00Z", updated_at: "2026-10-21T12:00:00Z" },
];
const onboarded = process.env.MOCK_ONBOARDED === "1";

http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  const send = (body, headers = {}) => {
    res.writeHead(200, { "content-type": "application/json", ...headers });
    res.end(JSON.stringify(body));
  };
  const p = url.pathname;
  if (p === "/auth/v1/user") return send(user);
  if (p === "/rest/v1/profiles") return send({ display_name: "Ada Obi", creator_type: "independent_animator", onboarded_at: onboarded ? "2026-11-03T00:00:00Z" : null });
  if (p === "/rest/v1/rpc/my_credit_balance") return send(465);
  if (p === "/rest/v1/projects") {
    if (req.method === "HEAD") { res.writeHead(200, { "content-range": "0-1/2" }); return res.end(); }
    const status = url.searchParams.get("status");
    let rows = projects;
    if (status) rows = rows.filter((r) => `eq.${r.status}` === status);
    const limit = Number(url.searchParams.get("limit") || 0);
    return send(limit ? rows.slice(0, limit) : rows);
  }
  if (p === "/rest/v1/credit_packs") return send([{ id: "starter", name: "Starter", price_usd_cents: 1000, credits: 500 }]);
  if (p === "/rest/v1/credit_ledger") return send([
    { id: 2, delta: -35, reason: "generation", note: null, created_at: "2026-11-03T08:00:00Z" },
    { id: 1, delta: 500, reason: "purchase", note: null, created_at: "2026-11-02T08:00:00Z" },
  ]);
  res.writeHead(404); res.end("{}");
}).listen(54321, () => console.log("mock supabase on :54321"));
