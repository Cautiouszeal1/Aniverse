"use client";

import { useActionState } from "react";
import { fileReport, requestDeletion } from "@/app/dashboard/settings/actions";
import { SubmitButton } from "@/components/ui/form";

const control =
  "w-full rounded-xl border border-silver-300/15 bg-navy-950/60 px-3.5 text-[0.95rem] text-white placeholder:text-silver-500 focus:border-cyan-400/70 focus:outline-none focus:ring-2 focus:ring-cyan-400/20";

export function DeletionRequestForm() {
  const [state, action] = useActionState(requestDeletion, {});
  if (state.ok) return <p role="status" className="mt-4 text-sm text-emerald-200">{state.message}</p>;
  return (
    <form action={action} className="mt-5 space-y-3">
      <div>
        <label htmlFor="del-reason" className="mb-1.5 block text-sm text-silver-100">Why are you leaving? <span className="text-silver-500">(optional)</span></label>
        <textarea id="del-reason" name="reason" rows={2} maxLength={1000} className={`${control} py-2.5`} />
      </div>
      <div>
        <label htmlFor="del-confirm" className="mb-1.5 block text-sm text-silver-100">Type DELETE to confirm</label>
        <input id="del-confirm" name="confirm" autoComplete="off" className={`${control} h-11`} />
      </div>
      {state.error ? <p role="alert" className="text-sm text-rose-300">{state.error}</p> : null}
      <SubmitButton pendingText="Sending…" variant="danger">Request deletion</SubmitButton>
    </form>
  );
}

export function ReportForm() {
  const [state, action] = useActionState(fileReport, {});
  if (state.ok) return <p role="status" className="text-sm text-emerald-200">{state.message}</p>;
  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="rep-cat" className="mb-1.5 block text-sm font-medium text-silver-100">Type</label>
        <select id="rep-cat" name="category" defaultValue={v.category ?? "copyright"} className={`${control} h-11`}>
          <option value="copyright">Copyright — my work was used without permission</option>
          <option value="impersonation">Impersonation of a real person</option>
          <option value="harmful">Harmful or abusive content</option>
          <option value="other">Something else</option>
        </select>
        {fe.category ? <p className="mt-1 text-sm text-rose-300">{fe.category}</p> : null}
      </div>
      <div>
        <label htmlFor="rep-target" className="mb-1.5 block text-sm font-medium text-silver-100">What are you reporting?</label>
        <input id="rep-target" name="target" defaultValue={v.target} maxLength={500} placeholder="Link, project or character name" className={`${control} h-11`} />
        {fe.target ? <p className="mt-1 text-sm text-rose-300">{fe.target}</p> : null}
      </div>
      <div>
        <label htmlFor="rep-details" className="mb-1.5 block text-sm font-medium text-silver-100">Details</label>
        <textarea id="rep-details" name="details" defaultValue={v.details} rows={4} maxLength={4000} placeholder="What's wrong, and for copyright: where your original work can be seen." className={`${control} py-2.5`} />
        {fe.details ? <p className="mt-1 text-sm text-rose-300">{fe.details}</p> : null}
      </div>
      {state.error ? <p role="alert" className="text-sm text-rose-300">{state.error}</p> : null}
      <SubmitButton pendingText="Sending…">Send report</SubmitButton>
    </form>
  );
}
