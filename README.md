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
| Character Studio: describe, style/mood/shape, 4 variations, keep, rename, refine into new versions, delete | ✅ Works in **demo mode** (free, clearly labelled placeholder art); real AI provider plugs into `src/server/providers/image/` |
| Storyboards, Animations, Media Library | ⏸ Shown as "Soon" (Milestones 4–5) |
| Account deletion request | ⏸ Disabled with explanation (Milestone 6) |
| Payments (Paystack), AI providers, admin console | ❌ Not started |

## Honesty rules this code follows

- No fake metrics, testimonials, partners, prices or user counts.
- Every control either works or is disabled with a visible reason.
- No tracking, cookies or analytics.

See `docs/ARCHITECTURE.md` for decisions and the founder approvals still needed.
