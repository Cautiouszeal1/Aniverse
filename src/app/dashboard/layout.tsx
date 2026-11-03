import type { Metadata } from "next";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import Link from "next/link";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · AniVerse" },
  robots: { index: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) {
    return (
      <main id="main" className="flex flex-1 items-center justify-center px-6 py-24 text-center">
        <div className="max-w-md">
          <h1 className="text-2xl font-semibold">Dashboard unavailable</h1>
          <p className="mt-3 text-silver-400">
            Accounts aren&apos;t switched on for this deployment yet. Connect
            Supabase as described in docs/SETUP.md.
          </p>
          <Link href="/" className="mt-6 inline-block text-cyan-300">
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main id="main" className="flex-1 px-4 py-8 sm:px-8">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
