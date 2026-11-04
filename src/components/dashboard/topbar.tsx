import Link from "next/link";
import { Suspense } from "react";
import { signOut } from "@/app/(auth)/actions";
import { getCreditBalance, getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MobileSidebar } from "./sidebar";

async function CreditChip() {
  const balance = await getCreditBalance();
  return (
    <Link
      href="/dashboard/credits"
      className="inline-flex h-9 items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 text-sm text-cyan-100 hover:border-cyan-400/50"
    >
      <span className="h-2 w-2 rounded-full bg-cyan-400" aria-hidden="true" />
      <span className="tabular-nums">{balance.toLocaleString("en-US")}</span>
      <span className="text-cyan-200/80">credits</span>
    </Link>
  );
}

async function UserMenu() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  const name = user.displayName || user.email;
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <details className="group relative">
      <summary
        className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-silver-300/15 bg-white/[0.04] py-1 pl-1 pr-3 text-sm text-silver-100 [&::-webkit-details-marker]:hidden"
        aria-label="Account menu"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 font-display text-xs font-semibold text-navy-950">
          {initial}
        </span>
        <span className="hidden max-w-[10rem] truncate sm:inline">{name}</span>
      </summary>
      <div className="absolute right-0 z-40 mt-2 w-60 rounded-2xl border hairline bg-navy-850 p-2 shadow-2xl">
        <p className="truncate px-3 py-2 text-xs text-silver-400">{user.email}</p>
        <Link href="/dashboard/settings" className="block rounded-xl px-3 py-2 text-sm text-silver-200 hover:bg-white/[0.05]">
          Settings
        </Link>
        {isAdmin ? (
          <Link href="/dashboard/admin" className="block rounded-xl px-3 py-2 text-sm text-amber-200 hover:bg-white/[0.05]">
            Admin console
          </Link>
        ) : null}
        <form action={signOut}>
          <button type="submit" className="block w-full rounded-xl px-3 py-2 text-left text-sm text-silver-200 hover:bg-white/[0.05]">
            Sign out
          </button>
        </form>
      </div>
    </details>
  );
}

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b hairline bg-navy-950/80 px-4 backdrop-blur-xl sm:px-6">
      <MobileSidebar />
      <div className="flex-1" />
      <Suspense fallback={<div className="h-9 w-28 animate-pulse rounded-full bg-white/[0.05]" />}>
        <CreditChip />
      </Suspense>
      <Suspense fallback={<div className="h-9 w-9 animate-pulse rounded-full bg-white/[0.05] sm:w-36" />}>
        <UserMenu />
      </Suspense>
    </header>
  );
}
