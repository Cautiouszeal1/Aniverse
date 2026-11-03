import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { blockTime, latestBlock, transfersInTx, transfersTo, type Transfer } from "./chain";

const CHUNK = 1_000; // blocks per log query (~33 min on Base)
const MAX_BLOCKS_PER_RUN = 20_000; // catch up ~11 h per run after downtime
const START_LOOKBACK = 1_800; // first run: look back ~1 h
const MIN_SECONDS_BETWEEN_SWEEPS = 8;

type Settings = {
  chain: string;
  token_address: string;
  receive_address: string;
  confirmations: number;
  enabled: boolean;
};

export type SweepResult = {
  scannedFrom: number | null;
  scannedTo: number | null;
  found: number;
  credited: number;
  unmatched: number;
  duplicates: number;
  skipped?: "recent" | "disabled";
};

async function loadSettings(admin: ReturnType<typeof createAdminClient>): Promise<Settings> {
  const { data, error } = await admin
    .from("payment_settings")
    .select("chain, token_address, receive_address, confirmations, enabled")
    .single();
  if (error || !data) throw new Error("payment settings missing");
  return data as Settings;
}

async function record(
  admin: ReturnType<typeof createAdminClient>,
  s: Settings,
  transfers: Transfer[],
  result: SweepResult,
) {
  const times = new Map<number, Date>();
  for (const t of transfers) {
    if (!times.has(t.blockNumber)) times.set(t.blockNumber, await blockTime(s.chain, t.blockNumber));
    const { data, error } = await admin.rpc("confirm_crypto_payment", {
      p_chain: s.chain,
      p_tx_hash: t.txHash,
      p_log_index: t.logIndex,
      p_block_number: t.blockNumber,
      p_from: t.from,
      p_to: t.to,
      p_token: t.token,
      p_units: t.units.toString(),
      p_block_time: times.get(t.blockNumber)!.toISOString(),
    });
    if (error) throw new Error(`confirm failed: ${error.message}`);
    result.found++;
    if (data === "credited") result.credited++;
    else if (data === "unmatched") result.unmatched++;
    else result.duplicates++;
  }
}

/**
 * Scans the receiving wallet for new USDC transfers and credits matching
 * orders. Safe to run often and concurrently: every transfer is recorded once.
 */
export async function sweep(opts: { force?: boolean } = {}): Promise<SweepResult> {
  const admin = createAdminClient();
  const s = await loadSettings(admin);
  const result: SweepResult = { scannedFrom: null, scannedTo: null, found: 0, credited: 0, unmatched: 0, duplicates: 0 };
  if (!s.enabled) return { ...result, skipped: "disabled" };

  const { data: state } = await admin
    .from("crypto_scan_state")
    .select("last_block, updated_at")
    .eq("chain", s.chain)
    .maybeSingle();

  if (!opts.force && state && Date.now() - new Date(state.updated_at).getTime() < MIN_SECONDS_BETWEEN_SWEEPS * 1000) {
    return { ...result, skipped: "recent" };
  }

  const head = await latestBlock(s.chain);
  const safeHead = head - s.confirmations;
  let from = state ? Number(state.last_block) + 1 : Math.max(0, safeHead - START_LOOKBACK);
  const end = Math.min(safeHead, from + MAX_BLOCKS_PER_RUN - 1);
  if (from > end) {
    await admin.from("crypto_scan_state").upsert({ chain: s.chain, last_block: state?.last_block ?? safeHead, updated_at: new Date().toISOString() });
    await admin.rpc("expire_crypto_orders");
    return result;
  }
  result.scannedFrom = from;

  while (from <= end) {
    let to = Math.min(end, from + CHUNK - 1);
    let transfers: Transfer[];
    try {
      transfers = await transfersTo(s.chain, s.token_address, s.receive_address, from, to);
    } catch (e) {
      // Some RPCs cap the range: retry once with a smaller window.
      to = Math.min(end, from + 199);
      transfers = await transfersTo(s.chain, s.token_address, s.receive_address, from, to).catch(() => {
        throw e;
      });
    }
    await record(admin, s, transfers, result);
    // Only move forward after this range is fully recorded.
    const { error } = await admin
      .from("crypto_scan_state")
      .upsert({ chain: s.chain, last_block: to, updated_at: new Date().toISOString() });
    if (error) throw new Error("could not save scan progress");
    result.scannedTo = to;
    from = to + 1;
  }

  await admin.rpc("expire_crypto_orders");
  return result;
}

export type TxCheck =
  | { state: "credited" | "already_recorded" | "unmatched" }
  | { state: "not_found" | "failed" | "not_to_us" | "not_confirmed" };

/** Verify a transaction hash a user pasted ("I've already paid"). */
export async function checkTransaction(txHash: string): Promise<TxCheck> {
  const admin = createAdminClient();
  const s = await loadSettings(admin);
  const r = await transfersInTx(s.chain, txHash, s.token_address, s.receive_address);
  if (r.state !== "ok") return { state: r.state };
  if (!r.transfers.length) return { state: "not_to_us" };
  const head = await latestBlock(s.chain);
  if (head - r.blockNumber < s.confirmations) return { state: "not_confirmed" };
  const result: SweepResult = { scannedFrom: null, scannedTo: null, found: 0, credited: 0, unmatched: 0, duplicates: 0 };
  await record(admin, s, r.transfers, result);
  if (result.credited) return { state: "credited" };
  if (result.unmatched) return { state: "unmatched" };
  return { state: "already_recorded" };
}
