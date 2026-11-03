import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";

export const metadata: Metadata = { title: "Link not valid" };

export default function AuthErrorPage() {
  return (
    <AuthCard
      title="This link has expired or was already used"
      subtitle="Email links work once and only for a limited time."
    >
      <div className="flex flex-col gap-3">
        <Link
          href="/login"
          className="inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-violet-500 text-sm font-medium text-white"
        >
          Go to sign in
        </Link>
        <Link
          href="/forgot-password"
          className="inline-flex h-11 items-center justify-center rounded-full border border-silver-300/20 text-sm text-silver-100 hover:border-cyan-400/50"
        >
          Send a new password reset link
        </Link>
      </div>
    </AuthCard>
  );
}
