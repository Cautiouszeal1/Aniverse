"use client";

import { useFormStatus } from "react-dom";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Field({
  label,
  name,
  error,
  hint,
  className,
  ...input
}: {
  label: string;
  name: string;
  error?: string;
  hint?: ReactNode;
} & ComponentPropsWithoutRef<"input">) {
  const id = `f-${name}`;
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-silver-100">
        {label}
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "h-11 w-full rounded-xl border bg-navy-950/60 px-3.5 text-[0.95rem] text-white placeholder:text-silver-500 transition-colors",
          "focus:border-cyan-400/70 focus:outline-none focus:ring-2 focus:ring-cyan-400/20",
          error ? "border-rose-400/70" : "border-silver-300/15",
        )}
        {...input}
      />
      {error ? (
        <p id={`${id}-err`} className="mt-1.5 text-sm text-rose-300">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-silver-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function SubmitButton({
  children,
  pendingText,
  className,
  disabled,
  variant = "primary",
}: {
  children: ReactNode;
  pendingText: string;
  className?: string;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
}) {
  const { pending } = useFormStatus();
  const styles = {
    primary:
      "bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-500 hover:to-violet-400",
    secondary:
      "border border-silver-300/20 bg-white/[0.04] text-silver-100 hover:border-cyan-400/50",
    danger: "border border-rose-400/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20",
  }[variant];
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending || undefined}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        styles,
        className,
      )}
    >
      {pending ? (
        <>
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
          />
          {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function Alert({
  tone,
  children,
}: {
  tone: "error" | "success" | "info";
  children: ReactNode;
}) {
  const styles = {
    error: "border-rose-400/40 bg-rose-500/10 text-rose-100",
    success: "border-emerald-400/40 bg-emerald-500/10 text-emerald-100",
    info: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100",
  }[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-xl border px-4 py-3 text-sm leading-relaxed", styles)}
    >
      {children}
    </div>
  );
}
