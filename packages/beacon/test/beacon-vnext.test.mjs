import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Ledger, KeyRing, signReceipt, generateKeypair,
  toInTotoStatement, attest, verifyDsse, IN_TOTO_STATEMENT, SLSA_PROVENANCE,
  evidenceFromMlflow, signMlflowModel,
} from "../src/index.mjs";

const mkReceipt = () => {
  const { privateKey } = generateKeypair();
  return signReceipt({ decision: "PASS", at: "2026-06-28" }, privateKey, { issuedAt: "2026-06-28T00:00:00Z" });
};

// --- ledger -----------------------------------------------------------------
test("ledger hash-chains entries, verifies, and detects tampering", async () => {
  const sink = { indexed: [], async index(e) { this.indexed.push(e); } };
  const ledger = new Ledger({ sink });
  await ledger.append(mkReceipt());
  await ledger.append(mkReceipt());

  assert.equal(ledger.verifyChain().ok, true);
  assert.equal(ledger.entries.length, 2);
  assert.equal(sink.indexed.length, 2);          // the OpenSearch-style sink received both
  assert.equal(ledger.entries[1].prev, ledger.entries[0].hash);

  ledger.entries[0].receipt.evidenceHash = "tampered"; // edit history
  const v = ledger.verifyChain();
  assert.equal(v.ok, false);
  assert.equal(v.brokenAt, 0);
});

test("ledger survives an NDJSON round-trip", async () => {
  const a = new Ledger();
  await a.append(mkReceipt());
  await a.append(mkReceipt());
  const b = Ledger.fromNDJSON(a.toNDJSON());
  assert.equal(b.verifyChain().ok, true);
  assert.equal(b.entries.length, 2);
});

// --- key rotation -----------------------------------------------------------
test("KeyRing: receipts signed before a rotation still verify after it", () => {
  const ring = new KeyRing();
  const before = ring.sign({ x: 1 });
  assert.equal(ring.verify(before), true);
  ring.rotate();
  const after = ring.sign({ x: 2 });
  assert.equal(ring.verify(before), true);  // retired key still verifies old receipts
  assert.equal(ring.verify(after), true);
  assert.equal(ring.publicKeys().length, 2);
});

// --- attestation (in-toto + DSSE + SLSA) ------------------------------------
test("receipt → in-toto Statement with a SLSA predicate", () => {
  const r = mkReceipt();
  const s = toInTotoStatement(r, { subjectName: "gate-decision" });
  assert.equal(s._type, IN_TOTO_STATEMENT);
  assert.equal(s.predicateType, SLSA_PROVENANCE);
  assert.equal(s.subject[0].digest.sha256, r.evidenceHash);
});

test("attest() produces a DSSE envelope that verifies and fails on tamper", () => {
  const r = mkReceipt();
  const { privateKey, publicKey } = generateKeypair();
  const env = attest(r, privateKey);
  assert.equal(env.payloadType, "application/vnd.in-toto+json");
  assert.equal(verifyDsse(env, publicKey), true);

  const forged = { ...env, payload: Buffer.from('{"_type":"forged"}').toString("base64") };
  assert.equal(verifyDsse(forged, publicKey), false);
});

// --- MLflow source ----------------------------------------------------------
test("MLflow adapter shapes a model version into signed evidence", async () => {
  const transport = async ({ url }) => {
    assert.match(url, /\/api\/2\.0\/mlflow\/model-versions\/get\?name=fraud&version=3/);
    return { status: 200, json: { model_version: { name: "fraud", version: "3", run_id: "abc", current_stage: "Production", source: "s3://m/3" } } };
  };
  const ev = await evidenceFromMlflow({ baseUrl: "http://mlflow", name: "fraud", version: "3", transport });
  assert.deepEqual(ev, { source: "mlflow", model: "fraud", version: "3", runId: "abc", stage: "Production", uri: "s3://m/3" });

  const out = await signMlflowModel({ baseUrl: "http://mlflow", name: "fraud", version: "3", transport });
  const { verifyReceipt } = await import("../src/index.mjs");
  assert.equal(verifyReceipt(out.receipt, out.publicKey), true);
});
