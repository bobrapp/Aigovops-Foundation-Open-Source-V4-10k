import { test } from "node:test";
import assert from "node:assert/strict";
import { TenantRegistry, resolveTenant, UsageMeter } from "../src/index.mjs";

test("registry always has the unlimited self-host tenant", () => {
  const r = new TenantRegistry();
  assert.equal(r.get("local").plan, "selfhost");
});

test("create / get / setPlan", () => {
  const r = new TenantRegistry();
  const t = r.create({ name: "Acme Health", plan: "free" });
  assert.equal(t.id, "acme-health");
  assert.equal(r.get("acme-health").plan, "free");
  r.setPlan("acme-health", "team");
  assert.equal(r.get("acme-health").plan, "team");
  assert.throws(() => r.setPlan("ghost", "team"), /no tenant/);
});

test("resolveTenant: self-host is always 'local'; hosted reads header or subdomain", () => {
  assert.equal(resolveTenant({ headers: { "x-aigovops-tenant": "acme" } }, { hostedMode: false }), "local");
  assert.equal(resolveTenant({ headers: { "x-aigovops-tenant": "acme" } }, { hostedMode: true }), "acme");
  assert.equal(resolveTenant({ host: "acme.aigovops.org" }, { hostedMode: true }), "acme");
  assert.equal(resolveTenant({ host: "app.aigovops.org" }, { hostedMode: true }), "demo");
});

test("usage meter accumulates per tenant", () => {
  const m = new UsageMeter();
  m.record("acme", "decisionsPerMonth");
  m.record("acme", "decisionsPerMonth", 4);
  m.record("beta", "decisionsPerMonth");
  assert.equal(m.get("acme", "decisionsPerMonth"), 5);
  assert.equal(m.get("beta", "decisionsPerMonth"), 1);
});
