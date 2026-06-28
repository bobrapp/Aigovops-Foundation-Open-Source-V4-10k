import { test } from "node:test";
import assert from "node:assert/strict";
import { decide } from "../src/index.mjs";
import { verifyReceipt } from "../../beacon/src/index.mjs";
import { Caps } from "../../caps/src/index.mjs";
import { SecretsProvider, EnvProvider } from "../../secrets/src/index.mjs";

const OK = {
  profile: "baseline",
  payload: { model: "claude-opus-4-8", humanApproved: true },
  baseline: { cost: 100 }, current: { cost: 102 }, tolerance: 0.05,
};

test("a clean reversible action auto-approves, signs, and verifies", () => {
  const r = decide(OK);
  assert.equal(r.status, "PASS");
  assert.deepEqual(r.gates.map((g) => g.gate), ["umbrella", "lantern", "beacon"]);
  assert.equal(verifyReceipt(r.receipt, r.publicKey), true);
});

test("criteria failure denies with mitigation and no receipt", () => {
  const r = decide({ ...OK, payload: { model: "gpt-4", humanApproved: false } });
  assert.equal(r.status, "FAIL");
  assert.equal(r.reason, "criteria");
  assert.equal(r.receipt, undefined);
  assert.ok(r.mitigation.length > 0);
});

test("drift beyond tolerance denies", () => {
  const r = decide({ ...OK, current: { cost: 200 } });
  assert.equal(r.status, "FAIL");
  assert.equal(r.reason, "criteria");
});

test("an irreversible action needs explicit approval — and a deny is still signed", () => {
  const pending = decide({ ...OK, irreversible: true });
  assert.equal(pending.status, "FAIL");
  assert.equal(pending.reason, "awaiting-approval");
  assert.ok(pending.receipt); // deny/await is auditable

  const denied = decide({ ...OK, irreversible: true, decision: "deny" });
  assert.equal(denied.reason, "denied");
  assert.equal(verifyReceipt(denied.receipt, denied.publicKey), true);

  const approved = decide({ ...OK, irreversible: true, decision: "approve" });
  assert.equal(approved.status, "PASS");
});

test("caps pause the approve path and emit a signed cap-breach", () => {
  const caps = new Caps();
  caps.setProfile("agent-1", { level: "act", maxSpend: 10 });
  const r = decide({ ...OK, caps, requestedBy: "agent-1", cost: { spend: 50 } });
  assert.equal(r.status, "FAIL");
  assert.equal(r.reason, "capped:spend-cap");
  assert.ok(r.receipt);
});

test("on approve, a scoped grant is brokered — never the raw secret", () => {
  const secrets = new SecretsProvider([new EnvProvider()]);
  const r = decide({ ...OK, secrets, scope: "github-deploy", ttlSeconds: 60 });
  assert.equal(r.status, "PASS");
  assert.equal(r.grant.scope, "github-deploy");
  assert.ok(r.grant.token && !("secret" in r.grant));
});
