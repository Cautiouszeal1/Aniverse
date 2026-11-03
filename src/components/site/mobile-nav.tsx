"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { navLinks, site } from "@/lib/site";
import { Button, ButtonLink } from "@/components/ui/button";

/** Accessible disclosure menu for small screens. Closes on Escape, link click or resize. */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const mq = window.matchMedia("(min-width: 768px)");
    const onMq = () => mq.matches && setOpen(false);
    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-silver-300/15 bg-white/[0.04] text-silver-100"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          {open ? (
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M4 7h16M4 12h16M4 17h16"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          )}
        </svg>
      </button>

      {open
        ? createPortal(
            <div
              id="mobile-menu"
              className="fixed inset-x-0 top-16 bottom-0 z-40 border-t hairline bg-navy-950 px-5 pb-10 pt-6 backdrop-blur-xl"
            >
              <nav aria-label="Mobile">
                <ul className="flex flex-col gap-1">
                  {navLinks.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        onClick={() => setOpen(false)}
                        className="block rounded-xl px-3 py-3 font-display text-lg text-silver-100 hover:bg-white/[0.05]"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="mt-6 border-t hairline pt-6">
            {site.accountsOpen ? (
              <div className="flex flex-col gap-3">
                <ButtonLink href="/signup" size="lg" className="w-full" onClick={() => setOpen(false)}>
                  Sign up
                </ButtonLink>
                <ButtonLink href="/login" size="lg" variant="secondary" className="w-full" onClick={() => setOpen(false)}>
                  Sign in
                </ButtonLink>
              </div>
            ) : (
              <>
                <Button size="lg" className="w-full" disabledReason="Accounts open with the closed beta">
                  Sign up
                </Button>
                <p className="mt-3 text-center text-sm text-silver-400">
                  Accounts open with the closed beta.
                </p>
              </>
            )}
          </div>
        </div>,
            document.body,
          )
        : null}
    </div>
  );
}
