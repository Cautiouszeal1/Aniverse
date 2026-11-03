import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Container } from "@/components/ui/primitives";
import { navLinks, site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t hairline bg-navy-950">
      <Container className="grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-silver-400">
            {site.tagline} AniVerse is in development. Ani Studio is the first
            product; a closed beta is planned.
          </p>
        </div>

        <nav aria-label="Footer: product">
          <h2 className="font-display text-sm font-semibold text-white">
            Product
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {navLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-silver-400 hover:text-white"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Footer: company">
          <h2 className="font-display text-sm font-semibold text-white">
            Company
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link href="/#contact" className="text-silver-400 hover:text-white">
                Contact
              </Link>
            </li>
            <li>
              <Link href="/terms" className="text-silver-400 hover:text-white">
                Terms
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="text-silver-400 hover:text-white">
                Privacy
              </Link>
            </li>
          </ul>
        </nav>
      </Container>
      <div className="border-t hairline">
        <Container className="flex flex-col gap-2 py-6 text-xs text-silver-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 AniVerse. Company incorporation pending.</p>
          <p>This website sets no tracking cookies and collects no personal data.</p>
        </Container>
      </div>
    </footer>
  );
}
