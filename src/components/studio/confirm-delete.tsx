"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/ui/form";

export function ConfirmDelete({
  action,
  fields,
  label,
  confirmText,
}: {
  action: (form: FormData) => Promise<void>;
  fields: Record<string, string>;
  label: string;
  confirmText: string;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="rounded-full border border-rose-400/25 px-4 py-2 text-sm text-rose-200 hover:bg-rose-500/10"
      >
        {label}
      </button>
    );
  }
  return (
    <form action={action} className="rounded-xl border border-rose-400/30 bg-rose-500/5 p-4">
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <p className="text-sm text-rose-100">{confirmText}</p>
      <div className="mt-3 flex gap-2">
        <SubmitButton pendingText="Deleting…" variant="danger">Yes, delete</SubmitButton>
        <button type="button" onClick={() => setAsking(false)} className="h-11 rounded-full px-4 text-sm text-silver-300 hover:bg-white/[0.05]">
          Cancel
        </button>
      </div>
    </form>
  );
}
