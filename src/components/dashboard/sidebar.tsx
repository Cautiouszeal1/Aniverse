"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/cn";

type NavItem =
  | { label: string; href: string; icon: string }
  | { label: string; soon: string; icon: string };

const NAV: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: "M4 13h6V4H4zm10 7h6v-9h-6zM4 20h6v-4H4zm10-11h6V4h-6z" },
  { label: "My Projects", href: "/dashboard/projects", icon: "M3 7h7l2 2h9v10H3z" },
  { label: "Character Studio", href: "/dashboard/studio", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 8c1-3.5 3.8-5.5 7-5.5s6 2 7 5.5" },
  { label: "Storyboards", href: "/dashboard/storyboards", icon: "M3 5h7v6H3zm11 0h7v6h-7zM3 14h7v6H3zm11 0h7v6h-7z" },
  { label: "Animations", href: "/dashboard/animations", icon: "M3 5h18v14H3zm7 4v6l5-3z" },
  { label: "Media Library", href: "/dashboard/library", icon: "M4 5h16v14H4zm0 10 4.5-4 4 3.5 3-2.5L20 15" },
  { label: "Credits & Billing", href: "/dashboard/credits", icon: "M12 3v18M17 7.5c0-1.9-2.2-3-5-3s-5 1.1-5 3 2 2.6 5 3.2 5 1.4 5 3.3-2.2 3-5 3-5-1.1-5-3" },
  { label: "Settings", href: "/dashboard/settings", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8-3 2-1.5-2-3.5-2.4.6a7 7 0 0 0-1.6-.9L15.5 4h-4l-.5 2.7a7 7 0 0 0-1.6.9L7 7 5 10.5 7 12l-2 1.5L7 17l2.4-.6c.5.4 1 .7 1.6.9l.5 2.7h4l.5-2.7c.6-.2 1.1-.5 1.6-.9L20 17l2-3.5z" },
  { label: "Help", href: "/dashboard/help", icon: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm-2.5-11.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14m0 3h.01" },
];

function ActiveNavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return <NavItems pathname={pathname} onNavigate={onNavigate} />;
}

/** Highlighting the current page reads the URL, so it streams in behind Suspense. */
function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Suspense fallback={<NavItems pathname="" onNavigate={onNavigate} />}>
      <ActiveNavList onNavigate={onNavigate} />
    </Suspense>
  );
}

function NavItems({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <ul className="space-y-1">
      {NAV.map((item) => {
        const icon = (
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={item.icon} />
          </svg>
        );
        if ("soon" in item) {
          return (
            <li key={item.label}>
              <span
                aria-disabled="true"
                title={`Arrives in ${item.soon}`}
                className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-silver-500"
              >
                {icon}
                <span className="flex-1">{item.label}</span>
                <span className="rounded-full border border-silver-300/15 px-2 py-0.5 text-[0.65rem] uppercase tracking-wider text-silver-500">
                  Soon
                </span>
              </span>
            </li>
          );
        }
        const inStudio =
          pathname.startsWith("/dashboard/studio") ||
          pathname.startsWith("/dashboard/characters") ||
          pathname.endsWith("/studio");
        const inStoryboard =
          pathname.startsWith("/dashboard/storyboards") || pathname.endsWith("/storyboard");
        const inAnimate = pathname.startsWith("/dashboard/animations") || pathname.endsWith("/animate");
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : item.href === "/dashboard/studio"
              ? inStudio
              : item.href === "/dashboard/storyboards"
                ? inStoryboard
                : item.href === "/dashboard/animations"
                  ? inAnimate
                  : item.href === "/dashboard/projects"
                    ? pathname.startsWith(item.href) && !inStudio && !inStoryboard && !inAnimate
                    : pathname.startsWith(item.href);
        return (
          <li key={item.label}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-gradient-to-r from-violet-600/30 to-cyan-400/5 text-white shadow-[inset_2px_0_0_0_#2ee6f6]"
                  : "text-silver-300 hover:bg-white/[0.04] hover:text-white",
              )}
            >
              {icon}
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r hairline bg-navy-900/70 px-4 py-5 lg:flex">
      <Link href="/dashboard" className="mb-8 px-2" aria-label="Dashboard home">
        <Logo />
      </Link>
      <nav aria-label="Dashboard">
        <NavList />
      </nav>
    </aside>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        aria-expanded={open}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-silver-300/15 bg-white/[0.04] text-silver-100"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
      {open
        ? createPortal(
            <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Navigation">
              <button
                type="button"
                aria-label="Close navigation"
                className="absolute inset-0 bg-navy-950/70 backdrop-blur-sm"
                onClick={() => setOpen(false)}
              />
              <div className="relative flex h-full w-72 max-w-[85vw] flex-col border-r hairline bg-navy-900 px-4 py-5">
                <div className="mb-8 flex items-center justify-between px-2">
                  <Logo />
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close navigation"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-silver-300 hover:bg-white/[0.05]"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                <nav aria-label="Dashboard">
                  <NavList onNavigate={() => setOpen(false)} />
                </nav>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
