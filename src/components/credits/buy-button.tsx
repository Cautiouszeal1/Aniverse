"use client";

import { useActionState } from "react";
import { startCryptoOrder, type StartState } from "@/app/dashboard/credits/actions";
import { Alert, SubmitButton } from "@/components/ui/form";

export function BuyWithCrypto({ packId, disabledReason }: { packId: string; disabledReason?: string }) {
  const [state, action] = useActionState(startCryptoOrder, {} as StartState);
  return (
    <form action={action} className="mt-5 space-y-2">
      <input type="hidden" name="packId" value={packId} />
      <SubmitButton pendingText="Preparing payment…" className="w-full" disabled={Boolean(disabledReason)}>
        Pay with USDC (Base)
      </SubmitButton>
      {disabledReason ? <p className="text-center text-xs text-silver-500">{disabledReason}</p> : null}
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
    </form>
  );
}
