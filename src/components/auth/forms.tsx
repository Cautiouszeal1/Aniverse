"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import {
  requestPasswordReset,
  signIn,
  signUp,
  updatePassword,
} from "@/app/(auth)/actions";
import { Alert, Field, SubmitButton } from "@/components/ui/form";
import type { FormState } from "@/lib/validation";

const initial: FormState = {};

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const [state, action] = useActionState(signIn, initial);
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      <input type="hidden" name="next" value={next} />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password}
      />
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm text-cyan-300 hover:text-cyan-200">
          Forgot password?
        </Link>
      </div>
      <SubmitButton pendingText="Signing in…" className="w-full">
        Sign in
      </SubmitButton>
    </form>
  );
}

export function SignupForm() {
  const [state, action] = useActionState(signUp, initial);
  if (state.ok) return <Alert tone="success">{state.message}</Alert>;
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      <Field
        label="Display name (optional)"
        name="displayName"
        autoComplete="nickname"
        maxLength={60}
        defaultValue={state.values?.displayName}
      />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.password}
        hint="At least 10 characters, with a letter and a number."
      />
      <div>
        <label className="flex items-start gap-3 text-sm text-silver-300">
          <input
            type="checkbox"
            name="terms"
            className="mt-0.5 h-4 w-4 shrink-0 accent-violet-500"
            aria-invalid={state.fieldErrors?.terms ? true : undefined}
          />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="text-cyan-300 underline-offset-2 hover:underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-cyan-300 underline-offset-2 hover:underline">
              Privacy notice
            </Link>
            .
          </span>
        </label>
        {state.fieldErrors?.terms ? (
          <p className="mt-1.5 text-sm text-rose-300">{state.fieldErrors.terms}</p>
        ) : null}
      </div>
      <SubmitButton pendingText="Creating account…" className="w-full">
        Create account
      </SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, initial);
  if (state.ok) return <Alert tone="success">{state.message}</Alert>;
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />
      <SubmitButton pendingText="Sending…" className="w-full">
        Send reset link
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ afterSuccessHref = "/dashboard" }: { afterSuccessHref?: string }) {
  const [state, action] = useActionState(updatePassword, initial);
  if (state.ok)
    return (
      <div className="space-y-5">
        <Alert tone="success">{state.message}</Alert>
        <Link
          href={afterSuccessHref}
          className="inline-flex h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-violet-500 text-sm font-medium text-white"
        >
          Continue
        </Link>
      </div>
    );
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error ? (
        <Alert tone="error">
          {state.error}{" "}
          <Link href="/forgot-password" className="underline">
            Request a new link
          </Link>
        </Alert>
      ) : null}
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.password}
        hint="At least 10 characters, with a letter and a number."
      />
      <Field
        label="Confirm new password"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.confirm}
      />
      <SubmitButton pendingText="Saving…" className="w-full">
        Save new password
      </SubmitButton>
    </form>
  );
}
