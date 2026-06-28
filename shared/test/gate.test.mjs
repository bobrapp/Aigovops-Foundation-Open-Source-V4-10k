import { test } from "node:test";
import assert from "node:assert/strict";
import { gate, PASS, FAIL } from "../gate.mjs";

test("all checks pass → PASS, no mitigation", () => {
  const r = gate("demo", [{ id: "a", pass: true }, { id: "b", pass: true }]);
  assert.equal(r.status, PASS);
  assert.deepEqual(r.failed, []);
  assert.deepEqual(r.mitigation, []);
});

test("any check fails → FAIL with mitigation, never MAYBE", () => {
  const r = gate("demo", [
    { id: "a", pass: true },
    { id: "b", pass: false, fix: "do the thing" },
  ]);
  assert.equal(r.status, FAIL);
  assert.deepEqual(r.failed, ["b"]);
  assert.deepEqual(r.mitigation, ["do the thing"]);
  assert.notEqual(r.status, "MAYBE");
});
