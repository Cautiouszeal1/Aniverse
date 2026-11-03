"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { cancelOrder, pollOrder, submitTxHash, type OrderStatus, type TxState } from "@/app/dashboard/credits/actions";
import { Alert, SubmitButton } from "@/components/ui/form";
import { explorerTx, formatUnits, TX_HASH_RE } from "@/lib/crypto/format";

type Order = {
  id: string;
  status: OrderStatus["status"];
  chain: string;
  chainId: number;
  token: string;
  tokenAddress: string;
  decimals: number;
  receiveAddress: string;
  units: string;
  credits: number;
  expiresAt: string;
  txHash: string | null;
};

type Eip1193 = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

const POLL_MS = 5000;

function useCountdown(to: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, new Date(to).getTime() - now);
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return { ms, label: `${m}:${String(s).padStart(2, "0")}` };
}

function CopyRow({ label, value, display }: { label: string; value: string; display?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-silver-400">{label}</p>
      <div className="flex items-center gap-2 rounded-xl border border-silver-300/15 bg-navy-950/60 p-2 pl-3">
        <code className="min-w-0 flex-1 break-all font-mono text-sm text-white">{display ?? value}</code>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              /* clipboard unavailable */
            }
          }}
          className="shrink-0 rounded-lg border border-silver-300/20 px-3 py-1.5 text-xs text-silver-100 hover:border-cyan-400/50"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export function PayPanel({ order, qrSvg }: { order: Order; qrSvg: string }) {
  const [status, setStatus] = useState<OrderStatus["status"]>(order.status);
  const [txHash, setTxHash] = useState<string | null>(order.txHash);
  const [walletMsg, setWalletMsg] = useState<string | null>(null);
  const [walletErr, setWalletErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [txState, txAction] = useActionState(submitTxHash, {} as TxState);
  const countdown = useCountdown(order.expiresAt);
  const amount = formatUnits(order.units, order.decimals);
  const done = status === "paid";
  const waiting = status === "pending" || status === "expired";

  useEffect(() => {
    if (!waiting) return;
    let stop = false;
    const tick = async () => {
      try {
        const r = await pollOrder(order.id);
        if (stop) return;
        setStatus(r.status);
        if (r.txHash) setTxHash(r.txHash);
      } catch {
        /* network blip: try again next tick */
      }
    };
    const t = setInterval(tick, POLL_MS);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [order.id, waiting]);

  async function payWithWallet() {
    setWalletErr(null);
    setWalletMsg(null);
    const eth = (window as unknown as { ethereum?: Eip1193 }).ethereum;
    if (!eth) {
      setWalletErr("No wallet found in this browser. Scan the QR code with your wallet app, or open this page inside your wallet's browser.");
      return;
    }
    setSending(true);
    try {
      const [from] = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      const chainHex = "0x" + order.chainId.toString(16);
      try {
        await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainHex }] });
      } catch (e) {
        if ((e as { code?: number }).code === 4902) {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [
              order.chain === "base-sepolia"
                ? { chainId: chainHex, chainName: "Base Sepolia", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: ["https://sepolia.base.org"], blockExplorerUrls: ["https://sepolia.basescan.org"] }
                : { chainId: chainHex, chainName: "Base", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: ["https://mainnet.base.org"], blockExplorerUrls: ["https://basescan.org"] },
            ],
          });
        } else throw e;
      }
      // ERC-20 transfer(address,uint256)
      const data =
        "0xa9059cbb" +
        order.receiveAddress.toLowerCase().replace(/^0x/, "").padStart(64, "0") +
        BigInt(order.units).toString(16).padStart(64, "0");
      const hash = (await eth.request({
        method: "eth_sendTransaction",
        params: [{ from, to: order.tokenAddress, data, value: "0x0" }],
      })) as string;
      if (TX_HASH_RE.test(hash)) {
        setTxHash(hash);
        setWalletMsg("Sent! Waiting for the network to confirm (usually under a minute).");
      }
    } catch (e) {
      const code = (e as { code?: number }).code;
      setWalletErr(
        code === 4001
          ? "You cancelled the payment in your wallet. Nothing was sent."
          : "Your wallet couldn't send the payment. Check you have enough USDC and a little ETH on Base for the network fee.",
      );
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="panel p-8 text-center" role="status">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/15 text-3xl text-emerald-300">✓</div>
        <h2 className="text-2xl font-semibold">Payment confirmed</h2>
        <p className="mt-2 text-silver-300">{order.credits.toLocaleString("en-US")} credits have been added to your account.</p>
        {txHash ? (
          <a href={explorerTx(order.chain, txHash)} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-cyan-300 hover:text-cyan-200">
            View transaction ↗
          </a>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard/studio" className="inline-flex h-11 items-center rounded-full bg-gradient-to-r from-violet-600 to-violet-500 px-5 text-sm font-medium text-white">
            Start creating
          </Link>
          <Link href="/dashboard/credits" className="inline-flex h-11 items-center rounded-full border border-silver-300/20 px-5 text-sm text-silver-100">
            Back to credits
          </Link>
        </div>
      </div>
    );
  }

  if (status === "cancelled" || status === "missing") {
    return (
      <div className="panel p-8 text-center">
        <h2 className="text-xl font-semibold">This payment was cancelled</h2>
        <p className="mt-2 text-sm text-silver-400">If you already sent USDC for it, paste the transaction hash below and we&apos;ll sort it out.</p>
        <Link href="/dashboard/credits" className="mt-5 inline-block text-cyan-300">Back to credits</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="panel space-y-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-silver-400">Send exactly</p>
            <p className="font-display text-3xl font-semibold tabular-nums text-white">
              {amount} <span className="text-lg text-silver-300">{order.token}</span>
            </p>
            <p className="mt-1 text-sm text-silver-400">
              on <strong className="text-silver-100">{order.chain === "base-sepolia" ? "Base Sepolia (test)" : "Base"}</strong> network · for {order.credits.toLocaleString("en-US")} credits
            </p>
          </div>
          <div className="text-right" aria-live="polite">
            {status === "pending" && countdown.ms > 0 ? (
              <>
                <p className="text-xs text-silver-500">Reserved for</p>
                <p className="font-mono text-lg text-silver-100">{countdown.label}</p>
              </>
            ) : (
              <p className="max-w-40 text-xs text-amber-200">Time&apos;s up, but if you&apos;ve sent it, it will still be credited.</p>
            )}
          </div>
        </div>

        <Alert tone="info">
          Send the <strong>exact amount</strong>, including all decimals. The
          last digits identify your payment, so credits are added
          automatically, even if you close this page or your phone goes off.
        </Alert>

        <button
          type="button"
          onClick={payWithWallet}
          disabled={sending}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-violet-500 text-[0.95rem] font-medium text-white hover:from-violet-500 hover:to-violet-400 disabled:opacity-60"
        >
          {sending ? "Confirm in your wallet…" : "Pay with wallet"}
        </button>
        {walletMsg ? <Alert tone="success">{walletMsg}</Alert> : null}
        {walletErr ? <Alert tone="error">{walletErr}</Alert> : null}

        <div className="relative py-1 text-center text-xs uppercase tracking-wider text-silver-500">
          <span className="relative z-10 bg-navy-900 px-3">or send manually</span>
          <span className="absolute inset-x-0 top-1/2 h-px bg-silver-300/10" aria-hidden="true" />
        </div>

        <CopyRow label="Amount (USDC)" value={amount} />
        <CopyRow label="To this address (Base network only)" value={order.receiveAddress} />
        <p className="text-xs text-silver-500">
          Only send <strong>USDC on Base</strong>. Other tokens or networks can&apos;t be credited automatically.
        </p>

        <div className="flex items-center gap-3 rounded-xl border hairline bg-white/[0.02] px-4 py-3 text-sm" aria-live="polite">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-400" aria-hidden="true" />
          <span className="text-silver-200">
            {txHash ? "Payment sent — waiting for confirmation…" : "Waiting for your payment…"}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="panel p-5 text-center">
          <p className="mb-3 text-sm text-silver-300">Scan with your wallet app</p>
          <div className="mx-auto w-56 rounded-xl bg-white p-3" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          <p className="mt-3 text-xs text-silver-500">The QR code fills in the address, amount and network for you.</p>
        </div>

        <details className="panel p-5">
          <summary className="cursor-pointer text-sm font-medium text-silver-100">Already paid? Paste the transaction hash</summary>
          <form action={txAction} className="mt-3 space-y-3">
            <input type="hidden" name="orderId" value={order.id} />
            <label htmlFor="f-txhash" className="sr-only">Transaction hash</label>
            <input
              id="f-txhash"
              name="txHash"
              placeholder="0x…"
              className="h-10 w-full rounded-xl border border-silver-300/15 bg-navy-950/60 px-3 font-mono text-xs text-white focus:border-cyan-400/70 focus:outline-none"
            />
            <SubmitButton pendingText="Checking…" variant="secondary" className="h-10 w-full">Check payment</SubmitButton>
            {txState.error ? <Alert tone="error">{txState.error}</Alert> : null}
            {txState.message ? <Alert tone={txState.ok ? "success" : "info"}>{txState.message}</Alert> : null}
          </form>
        </details>

        {status === "pending" && !txHash ? (
          <form action={cancelOrder} className="text-center">
            <input type="hidden" name="id" value={order.id} />
            <button type="submit" className="text-sm text-silver-500 hover:text-rose-200">Cancel this payment</button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
