import { test } from "node:test";
import assert from "node:assert/strict";
import { compilePolicy, compile, PolicyError } from "../src/index.mjs";

const POLICY = {
  name: "demo",
  rules: [
    { path: "model", op: "oneOf", value: ["claude-opus-4-8", "claude-sonnet-4-6"] },
    { path: "temperature", op: "lessThan", value: 1.5 },
    { path: "owner", op: "required" },
  ],
};

test("compile rejects a malformed policy", () => {
  assert.throws(() => compile({ name: "x" }), PolicyError);
  assert.throws(() => compile({ rules: [{ path: "a", op: "nope" }] }), PolicyError);
});

test("a satisfying payload → PASS, no violations", () => {
  const r = compilePolicy({ policy: POLICY, payload: { model: "claude-opus-4-8", temperature: 0.7, owner: "bob" } });
  assert.equal(r.status, "PASS");
  assert.deepEqual(r.violations, []);
});

test("a violating payload → FAIL with one mitigation per violation", () => {
  const r = compilePolicy({ policy: POLICY, payload: { model: "gpt-4", temperature: 2.0 } });
  assert.equal(r.status, "FAIL");
  assert.equal(r.violations.length, 3); // bad model, too hot, missing owner
  assert.equal(r.mitigation.length, 3);
});

test("a malformed policy fails the compile gate (never throws to caller)", () => {
  const r = compilePolicy({ policy: { rules: "not-an-array" } });
  assert.equal(r.status, "FAIL");
  assert.match(r.mitigation[0], /Fix the policy/);
});

test("named framework profile compiles and evaluates", () => {
  const pass = compilePolicy({ profile: "baseline", payload: { model: "claude-opus-4-8", humanApproved: true } });
  assert.equal(pass.status, "PASS");
  const fail = compilePolicy({ profile: "baseline", payload: { model: "gpt-4", humanApproved: false } });
  assert.equal(fail.status, "FAIL");
});
