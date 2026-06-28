import { test } from "node:test";
import assert from "node:assert/strict";
import { detectDrift } from "../src/index.mjs";

test("lantern gate PASSes when configured with input", () => {
  const r = detectDrift({ configured: true, payload: "x" });
  assert.equal(r.status, "PASS");
});

test("lantern gate FAILs with mitigation when unconfigured", () => {
  const r = detectDrift({});
  assert.equal(r.status, "FAIL");
  assert.ok(r.mitigation.length > 0);
});
