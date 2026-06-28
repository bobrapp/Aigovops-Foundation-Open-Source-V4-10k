import { test } from "node:test";
import assert from "node:assert/strict";
import { handle } from "../src/index.mjs";
import { registry, meter, meterDecision, accountFor } from "../src/saas.mjs";

test("pricing page renders the plans and leads with the self-host promise", async () => {
  const p = await handle({ method: "GET", path: "/pricing" });
  assert.match(p.html, /Govern your AI/);
  assert.match(p.html, /Self-hosted/);
  assert.match(p.html, /get\.aigovops\.org/);   // the on-prem one-liner is front and center
});

test("self-host default: account is the unlimited local tenant; billing is free", async () => {
  const acc = (await handle({ method: "GET", path: "/v1/account" })).json;
  assert.equal(acc.tenant, "local");
  assert.equal(acc.plan, "selfhost");
  assert.equal(acc.hosted, false);
  const co = (await handle({ method: "POST", path: "/v1/billing/checkout", body: {} })).json;
  assert.equal(co.plan, "selfhost");
  assert.equal(co.url, null);                    // LocalBilling — no charge, no external call
});

test("hosted mode meters per tenant and enforces the plan quota", () => {
  process.env.AIGOVOPS_HOSTED = "1";
  try {
    registry.create({ id: "acme", name: "Acme", plan: "free" });
    for (let i = 0; i < 999; i++) meter.record("acme", "decisionsPerMonth");
    assert.equal(meterDecision("acme").allowed, true);   // the 1000th is allowed
    assert.equal(meterDecision("acme").allowed, false);  // the 1001st exceeds the free limit
    assert.equal(accountFor("acme").hosted, true);
  } finally { delete process.env.AIGOVOPS_HOSTED; }
});

test("hosted decide returns 402 over quota; self-host is never gated", async () => {
  process.env.AIGOVOPS_HOSTED = "1";
  try {
    registry.create({ id: "tiny", name: "Tiny", plan: "free" });
    for (let i = 0; i < 1000; i++) meter.record("tiny", "decisionsPerMonth");
    const over = await handle({ method: "POST", path: "/v1/decide", headers: { "x-aigovops-tenant": "tiny" }, body: { profile: "baseline", payload: {} } });
    assert.equal(over.status, 402);
    assert.equal(over.json.upgrade, "/pricing");
  } finally { delete process.env.AIGOVOPS_HOSTED; }
  // back in self-host: unlimited
  const ok = await handle({ method: "POST", path: "/v1/decide", body: { profile: "baseline", payload: { model: "claude-opus-4-8", humanApproved: true } } });
  assert.equal(ok.json.status, "PASS");
});
