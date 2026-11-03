import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/primitives";
import { navLinks, site } from "@/lib/site";
import { MobileNav } from "./mobile-nav";

export function SiteHeader() {
  const closedReason = site.accountsOpen
    ? undefined
    : "Accounts open with the closed beta";
  return (
    <header className="sticky top-0 z-50 border-b hairline bg-navy-950/75 backdrop-blur-xl">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[60] focus:rounded-full focus:bg-violet-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link href="/" aria-label="AniVerse home" className="shrink-0">
          <Logo />
        </Link>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {navLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="rounded-full px-3 py-2 text-sm text-silver-300 transition-colors hover:text-white"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" disabledReason={closedReason}>
            Sign in
          </Button>
          <Button disabledReason={closedReason}>Sign up</Button>
        </div>

        <MobileNav />
      </Container>
    </header>
  );
}
