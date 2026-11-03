/** Shared (browser + server) helpers for USDC amounts and links. */

export function formatUnits(units: string | number | bigint, decimals: number) {
  const v = BigInt(units);
  const base = BigInt(10) ** BigInt(decimals);
  const whole = v / base;
  const frac = (v % base).toString().padStart(decimals, "0");
  return `${whole}.${frac}`;
}

/** EIP-681 payment request understood by most wallets (QR codes). */
export function paymentUri(o: { tokenAddress: string; chainId: number; receiveAddress: string; units: string }) {
  return `ethereum:${o.tokenAddress}@${o.chainId}/transfer?address=${o.receiveAddress}&uint256=${o.units}`;
}

export function explorerTx(chain: string, hash: string) {
  return chain === "base-sepolia" ? `https://sepolia.basescan.org/tx/${hash}` : `https://basescan.org/tx/${hash}`;
}

export function shortAddress(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;
