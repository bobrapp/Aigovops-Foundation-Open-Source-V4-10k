import { test } from "node:test";
import assert from "node:assert/strict";
import {
  compileFrameworkProfile, availableProfiles,
  Enforcer, toKyvernoPolicy, PolicyRegistry, compile,
} from "../src/index.mjs";

const EU = { jurisdiction: "EU", dataTypes: ["personal", "children"], riskTier: "high" };

// --- framework profiles -----------------------------------------------------
test("compiles a runnable EU AI Act profile from the corpus, with citations", () => {
  const p = compileFrameworkProfile("EU AI Act", EU);
  assert.ok(p.policy.rules.length >= 3);
  const ev = compile(p.policy);
  // a non-compliant payload fails; a compliant one passes
  assert.equal(ev.evaluate({}).status, "FAIL");
  const ok = {};
  for (const r of p.policy.rules) setDeep(ok, r.path, r.op === "required" ? true : r.value);
  assert.equal(ev.evaluate(ok).status, "PASS");
  assert.ok(Object.values(p.citations).flat().some((c) => /2024\/1689/.test(c)));
});

test("availableProfiles lists frameworks with gateable requirements", () => {
  assert.ok(availableProfiles(EU).includes("EU AI Act"));
});

// --- authorization ----------------------------------------------------------
test("RBAC enforcer honors role inheritance and wildcards", () => {
  const e = new Enforcer();
  e.addPolicy("admin", "*", "*").addRoleForUser("steward", "admin").addRoleForUser("bob", "steward");
  assert.equal(e.enforce("bob", "ledger", "kill"), true);     // bob → steward → admin → *,*
  assert.equal(e.enforce("alice", "ledger", "kill"), false);  // no role
  e.addPolicy("viewer", "ledger", "read").addRoleForUser("alice", "viewer");
  assert.equal(e.enforce("alice", "ledger", "read"), true);
  assert.equal(e.enforce("alice", "ledger", "kill"), false);
});

// --- Kyverno emitter --------------------------------------------------------
test("emits a Kyverno ClusterPolicy with one validate rule per Umbrella rule", () => {
  const policy = { name: "inference", rules: [{ path: "humanOversight.enabled", op: "equals", value: true }, { path: "logging.enabled", op: "equals", value: true }] };
  const k = toKyvernoPolicy(policy);
  assert.equal(k.apiVersion, "kyverno.io/v1");
  assert.equal(k.kind, "ClusterPolicy");
  assert.equal(k.spec.rules.length, 2);
  assert.ok(k.spec.rules[0].validate.pattern.metadata.labels);
});

// --- lifecycle --------------------------------------------------------------
test("registry versions policies; canary surfaces divergence vs current", () => {
  const reg = new PolicyRegistry();
  reg.publish({ name: "v1", rules: [{ path: "model", op: "required" }] });
  reg.publish({ name: "v2", rules: [{ path: "model", op: "oneOf", value: ["claude-opus-4-8"] }] });
  assert.equal(reg.current.version, 2);

  const candidate = { name: "v3", rules: [{ path: "model", op: "equals", value: "claude-opus-4-8" }] };
  const payloads = [{ model: "claude-opus-4-8" }, { model: "gpt-4" }];
  const c = reg.canary(candidate, payloads);
  assert.equal(c.total, 2);
  assert.equal(c.agreementRate, 1); // v2 (oneOf) and v3 (equals) agree on both here
});

function setDeep(obj, path, val) {
  const parts = path.split(".");
  let o = obj;
  for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]] ??= {};
  o[parts[parts.length - 1]] = val;
}
