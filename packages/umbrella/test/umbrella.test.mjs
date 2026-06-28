import { test } from "node:test";
import assert from "node:assert/strict";
import { compilePolicy } from "../src/index.mjs";

test("umbrella gate PASSes when configured with input", () => {
  const r = compilePolicy({ configured: true, payload: "x" });
  assert.equal(r.status, "PASS");
});

test("umbrella gate FAILs with mitigation when unconfigured", () => {
  const r = compilePolicy({});
  assert.equal(r.status, "FAIL");
  assert.ok(r.mitigation.length > 0);
});
