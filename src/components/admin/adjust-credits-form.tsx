"use client";

import { useActionState } from "react";
import { adjustCredits } from "@/app/dashboard/admin/actions";
import { SubmitButton } from "@/components/ui/form";

export function AdjustCreditsForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(adjustCredits, {});
  return (
    <form action={action} className="mt-3 flex flex-wrap items-start gap-2">
      <input type="hidden" name="userId" value={userId} />
      <label className="sr-only" htmlFor={`delta-${userId}`}>Credits to add or remove</label>
      <input
        id={`delta-${userId}`}
        name="delta"
        inputMode="numeric"
        placeholder="+500 or -100"
        className="h-10 w-32 rounded-xl border border-silver-300/15 bg-navy-950/60 px-3 text-sm text-white placeholder:text-silver-500"
      />
      <label className="sr-only" htmlFor={`note-${userId}`}>Reason</label>
      <input
        id={`note-${userId}`}
        name="note"
        maxLength={300}
        placeholder="Reason (kept in the audit log)"
        className="h-10 min-w-0 flex-1 rounded-xl border border-silver-300/15 bg-navy-950/60 px-3 text-sm text-white placeholder:text-silver-500"
      />
      <SubmitButton pendingText="Saving…" variant="secondary" className="h-10">Adjust</SubmitButton>
      {state.error ? <p role="alert" className="w-full text-sm text-rose-300">{state.error}</p> : null}
      {state.message ? <p role="status" className="w-full text-sm text-emerald-200">{state.message}</p> : null}
    </form>
  );
}
