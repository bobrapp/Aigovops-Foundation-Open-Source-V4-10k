import { test } from "node:test";
import assert from "node:assert/strict";
import { compare } from "../src/index.mjs";
import { improve } from "../../policy-improver/src/index.mjs";
import { authorPolicy, compliantExample } from "../../gate-author/src/index.mjs";
import { verifyReceipt } from "../../beacon/src/index.mjs";

const report = improve("We use an AI tutor.", { sector: "education", jurisdiction: "EU", dataTypes: ["personal", "children"], riskTier: "high" });
const authored = authorPolicy(report);

test("ungoverned always proceeds; governed blocks a non-compliant request with citations", () => {
  const r = compare({ payload: { model: "gpt-4" }, authored });
  assert.equal(r.ungoverned.proceeded, true);
  assert.equal(r.governed.status, "FAIL");
  assert.equal(r.governed.proceeded, false);
  assert.equal(r.governed.receipt, null);
  assert.ok(r.governed.blockedBy.length > 0);
  assert.ok(r.governed.blockedBy.every((b) => b.citations.length > 0), "each block names ≥1 citation");
  // the human-oversight gate carries BOTH controlling citations (EU AI Act Art.14 + GDPR Art.22)
  const oversight = r.governed.blockedBy.find((b) => b.path === "humanOversight.enabled");
  assert.ok(oversight && oversight.citations.length >= 2, "shared-path gate keeps all its citations");
  assert.match(r.narrative, /BLOCKED/);
});

test("a compliant request passes governed and yields a verifiable receipt", () => {
  const r = compare({ payload: compliantExample(authored.policy), authored });
  assert.equal(r.governed.status, "PASS");
  assert.equal(r.governed.proceeded, true);
  assert.deepEqual(r.governed.blockedBy, []);
  assert.equal(verifyReceipt(r.governed.receipt, r.governed.publicKey), true);
  assert.match(r.narrative, /PASS/);
});
