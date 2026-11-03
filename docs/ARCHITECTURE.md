# Architecture & decisions — Milestone 1

## Repository audit
This is a new repository. No existing code was overwritten. It was scaffolded with `create-next-app` (Next.js 16.4, React 19.3, Tailwind 4.3, ESLint 9).

## Decisions made
1. **Next.js App Router + TypeScript** as the blueprint specifies. Turbopack and Cache Components stay on (the Next 16 defaults). All current pages prerender as static.
2. **Self-hosted fonts.** Sora is the geometric display face and Inter is used for UI text. Self-hosting gives offline-safe builds and avoids third-party requests for privacy.
3. **Design tokens live in Tailwind `@theme`.** The scales are navy, violet, cyan and silver. Contrast was chosen for AA on the navy backgrounds.
4. **Interim logo.** An original "A" mark with a portal-ring crossbar. The CCO replaces it with the final mark.
5. **Disabled-with-reason pattern.** `<Button disabledReason="…">` renders a real disabled button with a title. This enforces the blueprint's "no dead buttons" rule.
6. **Feature flags in `src/lib/site.ts`.** `accountsOpen` switches on sign-in/up in Milestone 2. `contactEmail` comes from env.

## Proposed architecture for later milestones (needs approval)
- **One TypeScript API.** Use Next.js route handlers and server actions rather than a separate FastAPI service. That gives one language, one deploy and fewer moving parts for a three-person team. Revisit if heavy Python ML work appears.
- **Supabase** for Auth, Postgres and private Storage, with row-level security plus server-side ownership checks.
- **Background jobs** for AI generation use a queue such as Inngest, Trigger.dev or a Postgres-backed queue. They are idempotent, keyed by `generation_jobs.idempotency_key`.
- **Provider adapters** live in `src/server/providers/{image,video}/` behind one interface. A `test` provider is used when credentials are missing, and its output is clearly labelled as demo.
- **Credit ledger** is an append-only `credit_ledger` table, and the balance is a derived sum.

## Founder decisions required before Milestone 2
1. Confirm the single TypeScript API, or choose FastAPI.
2. Confirm Supabase or name another auth/DB provider.
3. Hosting choice (e.g. Vercel) and the domain.
4. Public contact email.
5. Image and video AI providers, after a review of commercial-use terms and cost per output.
6. Final logo and brand kit from the Chief Creative Officer.

## Verification (Milestone 1)
- `npm run lint`: pass
- `tsc --noEmit`: pass
- `npm run build`: pass (all routes static)
- Playwright check at 1440px and 390px: no horizontal overflow and no console errors. The mobile menu opens and closes. `/terms` returns 200 and unknown routes return 404.
