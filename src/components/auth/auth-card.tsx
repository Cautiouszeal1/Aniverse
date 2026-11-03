import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui/logo";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-16">
      <div className="grid-backdrop pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-[640px] -translate-x-1/2 rounded-full bg-violet-700/20 blur-[100px]" />
      <div className="relative w-full max-w-md">
        <div className="panel p-7 sm:p-9">
          <Link href="/" aria-label="AniVerse home" className="inline-block">
            <Logo />
          </Link>
          <h1 className="mt-7 text-2xl font-semibold">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm text-silver-400">{subtitle}</p> : null}
          <div className="mt-7">
            {isSupabaseConfigured ? children : <NotConfigured />}
          </div>
        </div>
        {footer ? <div className="mt-6 text-center text-sm text-silver-400">{footer}</div> : null}
      </div>
    </div>
  );
}

function NotConfigured() {
  return (
    <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm leading-relaxed text-amber-100">
      Accounts are temporarily unavailable. Please try again a little later.
    </div>
  );
}
