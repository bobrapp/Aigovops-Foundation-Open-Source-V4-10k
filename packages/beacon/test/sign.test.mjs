import { test } from "node:test";
import assert from "node:assert/strict";
import {
  signEvidence,
  signReceipt,
  verifyReceipt,
  generateKeypair,
  hashEvidence,
} from "../src/index.mjs";

test("hashEvidence is deterministic regardless of key order", () => {
  assert.equal(hashEvidence({ a: 1, b: 2 }), hashEvidence({ b: 2, a: 1 }));
});

test("a signed receipt verifies with its public key", () => {
  const { privateKey, publicKey } = generateKeypair();
  const receipt = signReceipt({ model: "x", decision: "PASS" }, privateKey, { issuedAt: "2026-06-28T00:00:00Z" });
  assert.equal(receipt.algorithm, "ed25519");
  assert.equal(verifyReceipt(receipt, publicKey), true);
});

test("a tampered receipt fails verification", () => {
  const { privateKey, publicKey } = generateKeypair();
  const receipt = signReceipt({ model: "x" }, privateKey, { issuedAt: "2026-06-28T00:00:00Z" });
  const forged = { ...receipt, evidenceHash: "deadbeef" };
  assert.equal(verifyReceipt(forged, publicKey), false);
});

test("a receipt does not verify under a different key", () => {
  const a = generateKeypair();
  const b = generateKeypair();
  const receipt = signReceipt({ model: "x" }, a.privateKey);
  assert.equal(verifyReceipt(receipt, b.publicKey), false);
});

test("signEvidence PASSes and returns a verifiable receipt", () => {
  const out = signEvidence({ configured: true, payload: { decision: "PASS" } });
  assert.equal(out.status, "PASS");
  assert.ok(out.receipt && out.publicKey);
  assert.equal(verifyReceipt(out.receipt, out.publicKey), true);
});

test("signEvidence FAILs with mitigation when no evidence", () => {
  const out = signEvidence({ configured: true });
  assert.equal(out.status, "FAIL");
  assert.ok(out.mitigation.length > 0);
  assert.equal(out.receipt, undefined);
});
