import { test } from "node:test";
import assert from "node:assert/strict";
import { runConformance, CONFORMANCE } from "../src/index.mjs";

test("the reference gate is fully conformant", () => {
  const r = runConformance();
  assert.equal(r.conformant, true, JSON.stringify(r.results.filter((x) => !x.ok)));
  assert.equal(r.passed, r.total);
  assert.ok(r.total >= 6);
});

test("a broken implementation is flagged non-conformant", () => {
  // An impl that always PASSes (never denies) must fail the deny/criteria checks.
  const broken = { decide: () => ({ status: "PASS", receipt: undefined, mitigation: [], reason: null }) };
  const r = runConformance(broken);
  assert.equal(r.conformant, false);
  assert.ok(r.passed < r.total);
});

test("every conformance check documents why it exists", () => {
  for (const c of CONFORMANCE) assert.ok(c.id && c.why && typeof c.run === "function");
});
