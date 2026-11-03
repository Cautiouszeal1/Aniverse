"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/ui/form";

export function ConfirmDelete({
  action,
  fields,
  label,
  confirmText,
  confirmLabel = "Yes, delete",
  tone = "danger",
}: {
  action: (form: FormData) => Promise<void>;
  fields: Record<string, string>;
  label: string;
  confirmText: string;
  confirmLabel?: string;
  tone?: "danger" | "neutral";
}) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className={
          tone === "danger"
            ? "rounded-full border border-rose-400/25 px-4 py-2 text-sm text-rose-200 hover:bg-rose-500/10"
            : "rounded-full border border-silver-300/20 px-4 py-2 text-sm text-silver-100 hover:border-cyan-400/50"
        }
      >
        {label}
      </button>
    );
  }
  return (
    <form
      action={action}
      className={
        tone === "danger"
          ? "rounded-xl border border-rose-400/30 bg-rose-500/5 p-4"
          : "rounded-xl border border-cyan-400/30 bg-cyan-400/5 p-4"
      }
    >
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <p className={tone === "danger" ? "text-sm text-rose-100" : "text-sm text-silver-100"}>{confirmText}</p>
      <div className="mt-3 flex gap-2">
        <SubmitButton pendingText="Working…" variant={tone === "danger" ? "danger" : "primary"}>{confirmLabel}</SubmitButton>
        <button type="button" onClick={() => setAsking(false)} className="h-11 rounded-full px-4 text-sm text-silver-300 hover:bg-white/[0.05]">
          Cancel
        </button>
      </div>
    </form>
  );
}
