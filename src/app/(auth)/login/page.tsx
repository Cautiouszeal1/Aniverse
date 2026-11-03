import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to continue to Ani Studio."
      footer={
        <>
          New to AniVerse?{" "}
          <Link href="/signup" className="text-cyan-300 hover:text-cyan-200">
            Create an account
          </Link>
        </>
      }
    >
      <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-white/[0.03]" />}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
