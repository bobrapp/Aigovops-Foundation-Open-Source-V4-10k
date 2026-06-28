import { test } from "node:test";
import assert from "node:assert/strict";
import { signEvidence } from "../src/index.mjs";

test("beacon gate PASSes when configured with input", () => {
  const r = signEvidence({ configured: true, payload: "x" });
  assert.equal(r.status, "PASS");
});

test("beacon gate FAILs with mitigation when unconfigured", () => {
  const r = signEvidence({});
  assert.equal(r.status, "FAIL");
  assert.ok(r.mitigation.length > 0);
});
