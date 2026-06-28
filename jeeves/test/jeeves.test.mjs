import { test } from "node:test";
import assert from "node:assert/strict";
import { orchestrate, verifyReceipt } from "../src/index.mjs";

const GOOD = {
  umbrella: { profile: "baseline", payload: { model: "claude-opus-4-8", humanApproved: true } },
  lantern: { baseline: { cost: 100 }, current: { cost: 102 }, tolerance: 0.05 },
};

test("clean run PASSes and produces a verifiable receipt", () => {
  const r = orchestrate(GOOD);
  assert.equal(r.status, "PASS");
  assert.equal(r.gates.length, 3); // umbrella, lantern, beacon
  assert.ok(r.receipt && r.publicKey);
  assert.equal(verifyReceipt(r.receipt, r.publicKey), true);
});

test("a policy violation FAILs the pipeline — and signs nothing", () => {
  const r = orchestrate({ ...GOOD, umbrella: { profile: "baseline", payload: { model: "gpt-4", humanApproved: false } } });
  assert.equal(r.status, "FAIL");
  assert.equal(r.receipt, undefined);
  assert.ok(r.mitigation.length > 0);
});

test("drift beyond tolerance FAILs the pipeline", () => {
  const r = orchestrate({ ...GOOD, lantern: { baseline: { cost: 100 }, current: { cost: 200 }, tolerance: 0.05 } });
  assert.equal(r.status, "FAIL");
  assert.equal(r.receipt, undefined);
});
