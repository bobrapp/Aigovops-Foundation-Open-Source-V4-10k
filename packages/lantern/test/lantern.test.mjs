import { test } from "node:test";
import assert from "node:assert/strict";
import { detectDrift, diff } from "../src/index.mjs";

test("identical snapshots → PASS, no drift", () => {
  const snap = { model: "claude-opus-4-8", cost: 100 };
  const r = detectDrift({ baseline: snap, current: { ...snap } });
  assert.equal(r.status, "PASS");
  assert.deepEqual(r.drift, []);
  assert.equal(r.escalate, "none");
});

test("numeric move within tolerance → PASS", () => {
  const r = detectDrift({ baseline: { cost: 100 }, current: { cost: 103 }, tolerance: 0.05 });
  assert.equal(r.status, "PASS");
});

test("numeric move beyond tolerance → FAIL with mitigation + escalation", () => {
  const r = detectDrift({ baseline: { cost: 100 }, current: { cost: 130 }, tolerance: 0.05 });
  assert.equal(r.status, "FAIL");
  assert.equal(r.drift.length, 1);
  assert.match(r.mitigation[0], /cost/);
  assert.equal(r.escalate, "notify");
});

test("a removed field is structural drift → escalate", () => {
  const r = detectDrift({ baseline: { a: 1, guardrail: true }, current: { a: 1 } });
  assert.equal(r.status, "FAIL");
  assert.equal(r.escalate, "escalate");
});

test("diff finds nested changes by path", () => {
  const changes = diff({ a: { b: 1 } }, { a: { b: 2 } });
  assert.equal(changes[0].path, "a.b");
  assert.equal(changes[0].kind, "changed");
});

test("FAILs with mitigation when a snapshot is missing", () => {
  const r = detectDrift({ baseline: { a: 1 } });
  assert.equal(r.status, "FAIL");
  assert.ok(r.mitigation.length > 0);
});
