import { test } from "node:test";
import assert from "node:assert/strict";
import { orchestrate } from "../src/index.mjs";

test("orchestrate PASSes when every product gate passes", () => {
  const r = orchestrate({
    beacon: { configured: true, payload: "a" },
    lantern: { configured: true, payload: "b" },
    umbrella: { configured: true, payload: "c" },
  });
  assert.equal(r.status, "PASS");
  assert.equal(r.gates.length, 3);
});

test("orchestrate FAILs if any product gate fails", () => {
  const r = orchestrate({ beacon: { configured: true, payload: "a" } });
  assert.equal(r.status, "FAIL");
});
