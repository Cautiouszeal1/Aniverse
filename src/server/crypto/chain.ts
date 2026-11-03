import "server-only";

/** keccak256("Transfer(address,address,uint256)") */
export const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

const DEFAULT_RPC: Record<string, string> = {
  base: "https://mainnet.base.org",
  "base-sepolia": "https://sepolia.base.org",
};

function rpcUrls(chain: string): string[] {
  const configured = (process.env.BASE_RPC_URLS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return configured.length ? configured : [DEFAULT_RPC[chain] ?? DEFAULT_RPC.base];
}

export class RpcError extends Error {}

/** JSON-RPC call with timeout, trying each configured endpoint in turn. */
export async function rpc<T>(chain: string, method: string, params: unknown[]): Promise<T> {
  let lastError: unknown;
  for (const url of rpcUrls(chain)) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
          signal: AbortSignal.timeout(12_000),
          cache: "no-store",
        });
        if (!res.ok) throw new RpcError(`rpc http ${res.status}`);
        const body = (await res.json()) as { result?: T; error?: { message?: string } };
        if (body.error) throw new RpcError(body.error.message ?? "rpc error");
        return body.result as T;
      } catch (e) {
        lastError = e;
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new RpcError("rpc failed");
}

export const hexToBigInt = (h: string) => BigInt(h);
export const hexToNumber = (h: string) => Number(BigInt(h));
export const toHex = (n: number | bigint) => "0x" + BigInt(n).toString(16);

export function addressTopic(address: string) {
  return "0x" + address.toLowerCase().replace(/^0x/, "").padStart(64, "0");
}
export function topicToAddress(topic: string) {
  return "0x" + topic.slice(-40).toLowerCase();
}

export type Transfer = {
  txHash: string;
  logIndex: number;
  blockNumber: number;
  from: string;
  to: string;
  token: string;
  units: bigint;
};

type RawLog = {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  transactionHash: string;
  logIndex: string;
  removed?: boolean;
};

/** Parse a raw log into a token transfer, or null if it isn't one we accept. */
export function parseTransferLog(log: RawLog, token: string, to: string): Transfer | null {
  if (log.removed) return null;
  if (log.address.toLowerCase() !== token.toLowerCase()) return null;
  if (log.topics.length !== 3 || log.topics[0].toLowerCase() !== TRANSFER_TOPIC) return null;
  if (topicToAddress(log.topics[2]) !== to.toLowerCase()) return null;
  let units: bigint;
  try {
    units = hexToBigInt(log.data === "0x" ? "0x0" : log.data);
  } catch {
    return null;
  }
  if (units <= BigInt(0)) return null;
  return {
    txHash: log.transactionHash.toLowerCase(),
    logIndex: hexToNumber(log.logIndex),
    blockNumber: hexToNumber(log.blockNumber),
    from: topicToAddress(log.topics[1]),
    to: to.toLowerCase(),
    token: token.toLowerCase(),
    units,
  };
}

export async function latestBlock(chain: string) {
  return hexToNumber(await rpc<string>(chain, "eth_blockNumber", []));
}

export async function transfersTo(
  chain: string,
  token: string,
  to: string,
  fromBlock: number,
  toBlock: number,
): Promise<Transfer[]> {
  const logs = await rpc<RawLog[]>(chain, "eth_getLogs", [
    {
      address: token,
      fromBlock: toHex(fromBlock),
      toBlock: toHex(toBlock),
      topics: [TRANSFER_TOPIC, null, addressTopic(to)],
    },
  ]);
  return (logs ?? []).map((l) => parseTransferLog(l, token, to)).filter((t): t is Transfer => t !== null);
}

export async function blockTime(chain: string, blockNumber: number): Promise<Date> {
  const block = await rpc<{ timestamp: string } | null>(chain, "eth_getBlockByNumber", [toHex(blockNumber), false]);
  if (!block) throw new RpcError("block not found");
  return new Date(hexToNumber(block.timestamp) * 1000);
}

/** Transfers to us inside one transaction (for "I've paid" hash lookups). */
export async function transfersInTx(chain: string, txHash: string, token: string, to: string) {
  const receipt = await rpc<{ status: string; blockNumber: string; logs: RawLog[] } | null>(
    chain,
    "eth_getTransactionReceipt",
    [txHash],
  );
  if (!receipt) return { state: "not_found" as const, transfers: [] as Transfer[] };
  if (receipt.status !== "0x1") return { state: "failed" as const, transfers: [] as Transfer[] };
  const transfers = receipt.logs
    .map((l) => parseTransferLog(l, token, to))
    .filter((t): t is Transfer => t !== null);
  return { state: "ok" as const, blockNumber: hexToNumber(receipt.blockNumber), transfers };
}
