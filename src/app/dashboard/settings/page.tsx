import type { Metadata } from "next";
import { Suspense } from "react";
import { signOut } from "@/app/(auth)/actions";
import { ResetPasswordForm } from "@/components/auth/forms";
import { ProfileForm } from "@/components/dashboard/forms";
import { PageHeader, PanelSkeleton } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Settings" description="Your profile, password and account." />
      <Suspense fallback={<PanelSkeleton rows={3} />}>
        <SettingsContent />
      </Suspense>
    </div>
  );
}

async function SettingsContent() {
  const user = await getCurrentUser();
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

      <section aria-labelledby="danger-title" className="panel border-rose-400/20 p-6">
        <h2 id="danger-title" className="text-lg font-semibold">Delete account</h2>
        <p className="mt-1 text-sm text-silver-500">
          Account deletion requests will be handled from here before the public launch.
        </p>
        <Button variant="secondary" className="mt-5" disabledReason="Account deletion requests arrive with the admin console (Milestone 6)">
          Request deletion
        </Button>
      </section>
    </div>
  );
}
