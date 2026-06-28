import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LocalPolicy, OpaPolicy, LocalDrift, PrometheusDrift,
  KeycloakIdentity, OpenSearchStore, KongGateway, selectBackends,
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
