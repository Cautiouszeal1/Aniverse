# AniVerse — Ani Studio

> Create Worlds. Bring Stories to Life.

AniVerse web platform. This repository currently contains **Milestone 1 — Design and Foundation**: the design system, responsive public website and reusable UI components.

## Quick start

```bash
npm install
cp .env.example .env.local   # optional: set NEXT_PUBLIC_CONTACT_EMAIL
npm run dev                  # http://localhost:3000
npm run check                # lint + typecheck + production build
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
| Sign in / Sign up buttons | ⏸ Disabled with an explanation (`site.accountsOpen = false`); enabled in Milestone 2 |
| Sample gallery | ⏸ Honest empty state until real original work exists |
| Auth, dashboard, studio, AI, billing, wallet | ❌ Not started (Milestones 2–7) |

## Honesty rules this code follows

- No fake metrics, testimonials, partners, prices or user counts.
- Every control either works or is disabled with a visible reason.
- No tracking, cookies or analytics.

See `docs/ARCHITECTURE.md` for decisions and the founder approvals still needed.
