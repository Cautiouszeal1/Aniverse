import type { Metadata } from "next";
import { Suspense } from "react";
import { signOut } from "@/app/(auth)/actions";
import { ResetPasswordForm } from "@/components/auth/forms";
import { DeletionRequestForm } from "@/components/dashboard/account-forms";
import { ProfileForm } from "@/components/dashboard/forms";
import { PageHeader, PanelSkeleton } from "@/components/dashboard/page-header";
import { SubmitButton } from "@/components/ui/form";
import { getCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { cancelDeletion } from "./actions";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Settings" description="Your profile, password, data and account." />
      <Suspense fallback={<PanelSkeleton rows={3} />}>
        <SettingsContent />
      </Suspense>
    </div>
  );
}

async function SettingsContent() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data: deletion } = await supabase
    .from("account_deletion_requests")
    .select("status, requested_at")
    .eq("user_id", user.id)
    .maybeSingle();
  const pending = deletion?.status === "pending";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section aria-labelledby="profile-title" className="panel p-6">
        <h2 id="profile-title" className="text-lg font-semibold">Profile</h2>
        <p className="mt-1 text-sm text-silver-500">Signed in as {user.email}</p>
        <div className="mt-5">
          <ProfileForm displayName={user.displayName} creatorType={user.creatorType} />
        </div>
      </section>

      <section aria-labelledby="password-title" className="panel p-6">
        <h2 id="password-title" className="text-lg font-semibold">Change password</h2>
        <div className="mt-5">
          <ResetPasswordForm afterSuccessHref="/dashboard/settings" />
        </div>
      </section>

      <section aria-labelledby="session-title" className="panel p-6">
        <h2 id="session-title" className="text-lg font-semibold">Session</h2>
        <p className="mt-1 text-sm text-silver-500">Sign out of AniVerse on this device.</p>
        <form action={signOut} className="mt-5">
          <button type="submit" className="inline-flex h-11 items-center rounded-full border border-silver-300/20 px-5 text-sm text-silver-100 hover:border-cyan-400/50">
            Sign out
          </button>
        </form>
      </section>

      <section aria-labelledby="data-title" className="panel p-6">
        <h2 id="data-title" className="text-lg font-semibold">Your data</h2>
        <p className="mt-1 text-sm text-silver-500">
          Download everything AniVerse stores about you — projects, characters, storyboards, clips and credit history — as one file.
        </p>
        <a href="/api/account/export" className="mt-5 inline-flex h-11 items-center rounded-full border border-silver-300/20 px-5 text-sm text-silver-100 hover:border-cyan-400/50">
          Download my data
        </a>
      </section>

      <section aria-labelledby="danger-title" className="panel border-rose-400/20 p-6 lg:col-span-2">
        <h2 id="danger-title" className="text-lg font-semibold">Delete account</h2>
        {pending ? (
          <>
            <p className="mt-1 text-sm text-amber-100">
              Deletion requested on {formatDate(deletion!.requested_at)}. Your account and all its files will be deleted within 30 days.
            </p>
            <form action={cancelDeletion} className="mt-5">
              <SubmitButton pendingText="Cancelling…" variant="secondary">Keep my account</SubmitButton>
            </form>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-silver-500">
              Permanently removes your account, projects, characters, clips and files within 30 days. Download your data first if you want a copy.
            </p>
            <DeletionRequestForm />
          </>
        )}
      </section>
    </div>
  );
}
