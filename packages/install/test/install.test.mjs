import { test } from "node:test";
import assert from "node:assert/strict";
import { onboard, detectTier, TIERS } from "../src/index.mjs";
import { verifyReceipt } from "../../beacon/src/index.mjs";

const BASE = {
  principals: { "bob": "steward", "dev": "developer" },
  capsProfiles: { jeeves: { level: "act", maxSpend: 100 } },
  writtenPolicy: "We use an AI tutor and tell students it is AI.",
  context: { sector: "education", jurisdiction: "EU", dataTypes: ["personal", "children"], riskTier: "high" },
};

test("detectTier honors AIGOVOPS_TIER and falls back sanely", () => {
  assert.equal(detectTier({ AIGOVOPS_TIER: "4" }).tier, 4);
  assert.equal(detectTier({ AIGOVOPS_TIER: "4" }).name, TIERS[4].name);
  assert.equal(detectTier({ AIGOVOPS_KMS: "1" }).tier, 6);
  assert.ok(detectTier({}).tier >= 1);
});

test("onboarding runs all six steps and signs a verifiable completion receipt", () => {
  const r = onboard(BASE);
  assert.deepEqual(r.steps.map((s) => s.id), ["identity", "caps", "policy", "gates", "proof", "cadence"]);
  assert.equal(r.complete, true);
  assert.equal(verifyReceipt(r.evidence, r.publicKey), true);
});

test("the proof step actually shows governed PASS and ungoverned-empty FAIL", () => {
  const proof = onboard(BASE).steps.find((s) => s.id === "proof");
  assert.equal(proof.detail.compliantPasses, true);
  assert.equal(proof.detail.emptyBlocked, true);
});

test("a steward is mandatory; unknown roles are rejected", () => {
  assert.throws(() => onboard({ ...BASE, principals: { dev: "developer" } }), /steward is required/);
  assert.throws(() => onboard({ ...BASE, principals: { bob: "wizard" } }), /unknown role/);
});
