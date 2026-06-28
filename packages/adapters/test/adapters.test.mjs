import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LocalPolicy, OpaPolicy, LocalDrift, PrometheusDrift, JaegerTraces,
  KeycloakIdentity, OpenSearchStore, KongGateway, selectBackends, AdapterError,
  TrivyGate, ZapGate, SemgrepGate,
} from "../src/index.mjs";

// A fake transport returns canned responses and records the request.
const fake = (responder) => {
  const calls = [];
  const transport = async (req) => { calls.push(req); return responder(req); };
  return { transport, calls };
};

const POLICY = { name: "p", rules: [{ path: "model", op: "oneOf", value: ["claude-opus-4-8"] }] };

test("LocalPolicy mirrors Umbrella", async () => {
  const r = await new LocalPolicy().evaluate({ policy: POLICY, payload: { model: "claude-opus-4-8" } });
  assert.equal(r.status, "PASS");
});

test("OpaPolicy maps OPA allow/violations into the gate shape", async () => {
  const denied = fake(() => ({ status: 200, json: { result: { allow: false, violations: ["model.not-allowed"] } } }));
  const opa = new OpaPolicy({ baseUrl: "http://opa:8181", transport: denied.transport });
  const r = await opa.evaluate({ payload: { model: "gpt-4" } });
  assert.equal(r.status, "FAIL");
  assert.equal(r.violations[0].path, "model.not-allowed");
  assert.match(denied.calls[0].url, /\/v1\/data\/aigovops\/authz$/);

  const ok = fake(() => ({ status: 200, json: { result: { allow: true, violations: [] } } }));
  const r2 = await new OpaPolicy({ baseUrl: "x", transport: ok.transport }).evaluate({ payload: {} });
  assert.equal(r2.status, "PASS");
});

test("PrometheusDrift flags a metric beyond tolerance", async () => {
  const t = fake(() => ({ status: 200, json: { status: "success", data: { result: [{ value: [0, "130"] }] } } }));
  const p = new PrometheusDrift({ baseUrl: "http://prom:9090", transport: t.transport });
  const r = await p.check({ query: "cost", baseline: 100, tolerance: 0.05 });
  assert.equal(r.status, "FAIL");
  assert.equal(r.current, 130);
});

test("JaegerTraces computes a trace error rate", async () => {
  const t = fake(() => ({ status: 200, json: { data: [
    { spans: [{ tags: [{ key: "error", value: true }] }] },
    { spans: [{ tags: [{ key: "http.status", value: 200 }] }] },
  ] } }));
  const j = new JaegerTraces({ baseUrl: "http://jaeger", transport: t.transport });
  const r = await j.errorRate({ service: "gate" });
  assert.equal(r.total, 2);
  assert.equal(r.errored, 1);
  assert.equal(r.rate, 0.5);
});

test("KeycloakIdentity maps realm roles to our roles", async () => {
  const t = fake(() => ({ status: 200, json: { active: true, realm_access: { roles: ["kc-admin", "kc-dev", "noise"] } } }));
  const id = new KeycloakIdentity({ baseUrl: "http://kc", roleMap: { "kc-admin": "steward", "kc-dev": "developer" }, transport: t.transport });
  const roles = await id.resolveRoles("tok");
  assert.deepEqual(roles.sort(), ["developer", "steward"]);
});

test("OpenSearchStore indexes and searches", async () => {
  const t = fake((req) =>
    req.url.endsWith("_search")
      ? { status: 200, json: { hits: { hits: [{ _source: { id: "r1" } }] } } }
      : { status: 201, json: {} });
  const store = new OpenSearchStore({ baseUrl: "http://os", transport: t.transport });
  assert.deepEqual(await store.index({ id: "r1" }), { ok: true });
  assert.deepEqual(await store.search({ query: { match_all: {} } }), [{ id: "r1" }]);
});

test("security gates map scanner reports to PASS/FAIL on severity", () => {
  assert.equal(new TrivyGate().evaluate({ Results: [{ Vulnerabilities: [{ Severity: "LOW" }] }] }).status, "PASS");
  const trivy = new TrivyGate().evaluate({ Results: [{ Vulnerabilities: [{ Severity: "CRITICAL" }, { Severity: "LOW" }] }] });
  assert.equal(trivy.status, "FAIL");
  assert.equal(trivy.findings, 1);
  assert.equal(new ZapGate().evaluate({ site: [{ alerts: [{ riskcode: "3" }] }] }).status, "FAIL");
  assert.equal(new ZapGate().evaluate({ site: [{ alerts: [{ riskcode: "1" }] }] }).status, "PASS");
  assert.equal(new SemgrepGate().evaluate({ results: [{ extra: { severity: "ERROR" } }] }).status, "FAIL");
  assert.equal(new SemgrepGate().evaluate({ results: [{ extra: { severity: "INFO" } }] }).status, "PASS");
});

test("KongGateway emits declarative routing config", async () => {
  const cfg = await new KongGateway().route({ service: "inference", upstream: "http://model", gateUrl: "http://gate" });
  assert.equal(cfg.services[0].name, "inference");
  assert.equal(cfg.services[0].routes[0].paths[0], "/inference");
});

test("selectBackends picks local for tiers 1-3 and heavyweight for 4-6", () => {
  assert.equal(selectBackends(2).policy.name, "local");
  assert.equal(selectBackends(5, { opa: { baseUrl: "x" } }).policy.name, "opa");
  assert.equal(selectBackends(5, { keycloak: { baseUrl: "x" } }).identity.name, "keycloak");
});

// --- hardening: retry, errors, auth, health ---------------------------------
test("a 5xx is retried with backoff, then succeeds", async () => {
  let n = 0;
  const t = fake(() => (++n <= 2
    ? { status: 503, json: null }
    : { status: 200, json: { result: { allow: true, violations: [] } } }));
  const opa = new OpaPolicy({ baseUrl: "x", transport: t.transport, backoffMs: 0 });
  const r = await opa.evaluate({ payload: {} });
  assert.equal(r.status, "PASS");
  assert.equal(n, 3); // 2 failures + 1 success
});

test("exhausted retries throw a typed AdapterError carrying the status", async () => {
  const t = fake(() => ({ status: 503, json: null }));
  const opa = new OpaPolicy({ baseUrl: "x", transport: t.transport, retries: 1, backoffMs: 0 });
  await assert.rejects(() => opa.evaluate({ payload: {} }), (e) => e instanceof AdapterError && e.status === 503 && e.adapter === "opa");
  assert.equal(t.calls.length, 2); // initial + 1 retry
});

test("auth headers are sent on every request", async () => {
  const t = fake(() => ({ status: 200, json: { result: { allow: true, violations: [] } } }));
  const opa = new OpaPolicy({ baseUrl: "x", transport: t.transport, headers: { authorization: "Bearer tok" } });
  await opa.evaluate({ payload: {} });
  assert.equal(t.calls[0].headers.authorization, "Bearer tok");
});

test("health() pings the backend's health endpoint", async () => {
  const t = fake((req) => ({ status: req.url.endsWith("/health") ? 200 : 404, json: {} }));
  assert.equal(await new OpaPolicy({ baseUrl: "http://opa", transport: t.transport }).health(), true);
});
