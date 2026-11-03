// Builds the auth cookie @supabase/ssr expects, for the visual harness only.
const b64url = (o) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
export function sessionCookie() {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const jwt = [b64url({ alg: "HS256", typ: "JWT" }), b64url({ sub: "11111111-1111-1111-1111-111111111111", exp, role: "authenticated", aud: "authenticated" }), "sig"].join(".");
  const session = { access_token: jwt, refresh_token: "r", token_type: "bearer", expires_in: 3600, expires_at: exp,
    user: { id: "11111111-1111-1111-1111-111111111111", email: "ada@example.com", aud: "authenticated", role: "authenticated" } };
  return { name: "sb-localhost-auth-token", value: "base64-" + b64url(session), domain: "localhost", path: "/" };
}
