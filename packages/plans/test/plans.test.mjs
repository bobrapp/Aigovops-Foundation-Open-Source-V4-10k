import { test } from "node:test";
import assert from "node:assert/strict";
import { planFor, can, withinQuota, entitlement, PLANS } from "../src/index.mjs";

test("self-host is unlimited and free — the open-core promise", () => {
  const s = PLANS.selfhost;
  assert.equal(s.price, 0);
  assert.equal(s.limits.decisionsPerMonth, Infinity);
  assert.ok(can(s, "attestation"));      // every feature
  assert.ok(withinQuota(s, "decisionsPerMonth", 10 ** 9));
});

test("free plan gates features and quota; team unlocks more", () => {
  assert.equal(can("free", "attestation"), false);
  assert.equal(can("team", "attestation"), true);
  assert.equal(withinQuota("free", "decisionsPerMonth", 999), true);
  assert.equal(withinQuota("free", "decisionsPerMonth", 1000), false);   // at the limit
});

test("enterprise is unlimited via the wildcard feature", () => {
  assert.ok(can("enterprise", "anything-at-all"));
  assert.equal(entitlement("enterprise").limits.gates, Infinity);
});

test("planFor falls back to free for unknown ids", () => {
  assert.equal(planFor("nope").id, "free");
});
