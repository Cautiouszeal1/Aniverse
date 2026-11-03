import { test } from "node:test";
import assert from "node:assert/strict";
import { addressTopic, parseTransferLog, TRANSFER_TOPIC } from "../../src/server/crypto/chain";

const USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const US = "0x14a15a119f2bec1f09cc6261050ded87db3ddd38";
const PAYER = "0x1111111111111111111111111111111111111111";

const log = (over: Record<string, unknown> = {}) => ({
  address: USDC,
  topics: [TRANSFER_TOPIC, addressTopic(PAYER), addressTopic(US)],
  data: "0x" + BigInt(10_004_213).toString(16).padStart(64, "0"),
  blockNumber: "0x10",
  transactionHash: "0x" + "ab".repeat(32),
  logIndex: "0x2",
  ...over,
});

test("parses a valid USDC transfer to us", () => {
  const t = parseTransferLog(log(), USDC, US);
  assert.ok(t);
  assert.equal(t.units, BigInt(10_004_213));
  assert.equal(t.from, PAYER);
  assert.equal(t.to, US);
  assert.equal(t.logIndex, 2);
  assert.equal(t.blockNumber, 16);
});

test("accepts mixed-case addresses", () => {
  assert.ok(parseTransferLog(log({ address: USDC.toUpperCase().replace("0X", "0x") }), USDC, US.toUpperCase().replace("0X", "0x")));
});

test("rejects a different token contract (fake USDC)", () => {
  assert.equal(parseTransferLog(log({ address: "0x" + "9".repeat(40) }), USDC, US), null);
});

test("rejects transfers to another wallet", () => {
  assert.equal(
    parseTransferLog(log({ topics: [TRANSFER_TOPIC, addressTopic(PAYER), addressTopic("0x" + "2".repeat(40))] }), USDC, US),
    null,
  );
});

test("rejects non-Transfer events and removed (reorged) logs", () => {
  assert.equal(parseTransferLog(log({ topics: ["0x" + "0".repeat(64), addressTopic(PAYER), addressTopic(US)] }), USDC, US), null);
  assert.equal(parseTransferLog(log({ removed: true }), USDC, US), null);
});

test("rejects zero and garbage amounts", () => {
  assert.equal(parseTransferLog(log({ data: "0x" + "0".repeat(64) }), USDC, US), null);
  assert.equal(parseTransferLog(log({ data: "0xnothex" }), USDC, US), null);
});
