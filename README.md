# AniVerse — Ani Studio

> Create Worlds. Bring Stories to Life.

AniVerse web platform. Done so far: **Milestone 1** (design system and public website) and **Milestone 2** (accounts, protected dashboard, projects, and the credit ledger the business model relies on).

To switch accounts on, follow **docs/SETUP.md** (Supabase free plan, about 15 minutes).

## Quick start

```bash
npm install
cp .env.example .env.local   # optional: set NEXT_PUBLIC_CONTACT_EMAIL
npm run dev                  # http://localhost:3000
npm run check                # lint + typecheck + production build
tests/db/run.sh              # database tests against a local Postgres
npm run test:unit            # unit tests (payments, pay-safe jobs, video engine, prompts)
npm run check:configured     # build as if Supabase is connected (catches dashboard-only build errors)
```

Requires Node.js 20.9+ (tested on Node 22).

## Stack

- Next.js 16 (App Router, Turbopack, Cache Components) + React 19 + TypeScript
- Tailwind CSS v4 (design tokens in `src/app/globals.css`)
- Sora (display) and Inter (body) fonts, self-hosted under SIL OFL in `src/app/fonts/`. There are no Google Fonts calls at build or runtime.

## Structure

```
src/
  app/
    layout.tsx         Root layout: fonts, metadata, header/footer
    page.tsx           Home page (composes sections)
    terms/, privacy/   Pre-launch legal notices (honest, not placeholders)
    not-found.tsx      404
    globals.css        Design tokens + base styles + utilities
    fonts/             Vendored variable fonts
  components/
    ui/                Design system: Button, ButtonLink, Badge, Card,
                       Container, Section, SectionHeading, Logo
    site/              SiteHeader, MobileNav, SiteFooter, LegalPage
    home/              Hero and home-page sections
  lib/
    site.ts            Site facts and flags (single source of truth)
    cn.ts              className helper
```

## Feature status

| Area | Status |
|---|---|
| Design tokens, typography, components | ✅ Working |
| Responsive header + accessible mobile menu | ✅ Working (Escape closes it, focus returns to the toggle, closes on resize) |
| Home page: hero, workflow, studio overview, gallery, ecosystem, pricing, FAQ, contact | ✅ Working |
| Terms / Privacy pages | ✅ Pre-launch notices; full legal text needed before beta |
| Contact | ⚙️ Shows the email when `NEXT_PUBLIC_CONTACT_EMAIL` is set; otherwise shows an honest notice |
| Sign up, email confirmation, sign in/out, forgot/reset password | ✅ Built; needs Supabase connected to go live. Not yet tested against a live Supabase project |
| Route protection (proxy + server checks + row-level security) | ✅ DB tests pass; redirects tested |
| Onboarding (display name, creator type, terms version recorded) | ✅ |
| Dashboard: overview, projects (create/rename/archive/delete), credits page, settings | ✅ |
| Credit ledger: append-only, idempotent purchases, no double charge, no overspend | ✅ DB tests pass |
| Credit pack: Starter $10 = 500 credits ($5 AI usage, $5 AniVerse) | ✅ Data in place; **Buy** is disabled until payments (Milestone 6) |
| Character Studio: describe, style/mood/shape, 4 variations, keep, rename, refine into new versions, delete | ✅ Real AI images via **Pollinations.ai free tier** (FLUX; no key; loaded one by one in the browser, auto-retry when busy). `IMAGE_PROVIDER=demo` switches to placeholder art. Paid providers plug into `src/server/providers/image/` |
| Storyboard editor: scenes with title, action, dialogue, shot, camera notes, duration and characters; add, edit, duplicate, delete, reorder; saved versions with restore | ✅ |
| Animation workspace: scene timeline, Standard/Premium quality, length and shape, character picture as the starting frame, background rendering (works if the user leaves), status tracking, version history, film player, MP4 download | ✅ Real AI video through the same AI key, white-labelled as AniVerse AI. Labelled demo mode (no charge, no fake video) when the key is missing or `VIDEO_PROVIDER=demo` |
| Pay-safe generation: charge on start, automatic refund on any failure, stuck-job safety net, auto-pause when the engine account runs out of funds | ✅ DB + unit + end-to-end tests |
| Media Library: characters, videos and storyboards, filter by type and project, private expiring links | ✅ |
| Settings: data export (JSON), account deletion request + cancel | ✅ |
| Help: how-to, FAQ, copyright/content report form | ✅ |
| Admin console: AI service pause/resume, 30-day usage, animation prices, user lookup, credit adjustments with reason + audit log, recent jobs, reports, account deletions | ✅ Server-side admin checks on every action |
| USDC on Base payments: unique-amount orders, wallet button + QR + manual, automatic on-chain verification every minute (works with the user offline), tx-hash fallback, unmatched-payment admin resolution | ✅ (see docs/SETUP.md) |
| Card payments | ❌ Not started |
| Joining all scenes into one film file | ❌ Not started (each clip downloads separately; the film player plays them in order) |

## Honesty rules this code follows

- No fake metrics, testimonials, partners, prices or user counts.
- Every control either works or is disabled with a visible reason.
- No tracking, cookies or analytics.

See `docs/ARCHITECTURE.md` for decisions and the founder approvals still needed.
