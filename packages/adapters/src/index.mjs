// M4 — heavyweight adapters. One contract per capability; a local (zero-dep) default
// and a shim that maps a production backend's response into the SAME shape. Define the
// safety contract once; enforce it with the strongest backend each environment allows.
//
// Every shim takes an injectable `transport({method,url,headers,body}) → {status,json}`
// (defaults to fetch) so the request-building + response-mapping logic is unit-testable
// against canned responses, with no live service and no runtime dependency.
import { compile } from "../../umbrella/src/index.mjs";
import { detectDrift } from "../../lantern/src/index.mjs";

export async function fetchTransport({ method = "GET", url, headers = {}, body } = {}) {
  const res = await fetch(url, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, json };
}

// --- Policy (Umbrella backend) ----------------------------------------------
export class LocalPolicy {
  name = "local";
  async evaluate({ policy, payload }) {
    return compile(policy).evaluate(payload ?? {});
  }
}
export class OpaPolicy {
  // Open Policy Agent. Maps OPA's { result: { allow, violations } } → our gate shape.
  name = "opa";
  constructor({ baseUrl, pkg = "aigovops/authz", transport = fetchTransport } = {}) {
    Object.assign(this, { baseUrl, pkg, transport });
  }
  async evaluate({ payload }) {
    const { status, json } = await this.transport({
      method: "POST",
      url: `${this.baseUrl}/v1/data/${this.pkg}`,
      body: { input: payload ?? {} },
    });
    if (status !== 200 || !json) throw new Error(`OPA ${status}`);
    const r = json.result || {};
    const violations = (r.violations || []).map((v) => (typeof v === "string" ? { path: v, message: v } : v));
    const ok = r.allow === true && violations.length === 0;
    return { status: ok ? "PASS" : "FAIL", violations };
  }
}

// --- Drift (Lantern backend) ------------------------------------------------
export class LocalDrift {
  name = "local";
  async check({ baseline, current, tolerance }) {
    return detectDrift({ baseline, current, tolerance });
  }
}
export class PrometheusDrift {
  // Queries a PromQL metric and compares its value to a baseline within tolerance.
  name = "prometheus";
  constructor({ baseUrl, transport = fetchTransport } = {}) {
    Object.assign(this, { baseUrl, transport });
  }
  async check({ query, baseline, tolerance = 0 }) {
    const { status, json } = await this.transport({ url: `${this.baseUrl}/api/v1/query?query=${encodeURIComponent(query)}` });
    if (status !== 200 || json?.status !== "success") throw new Error(`Prometheus ${status}`);
    const current = Number(json.data?.result?.[0]?.value?.[1]);
    const denom = Math.max(Math.abs(baseline), 1e-9);
    const drifted = Math.abs(current - baseline) / denom > tolerance;
    return { status: drifted ? "FAIL" : "PASS", current, baseline, drift: drifted ? [{ query, from: baseline, to: current }] : [] };
  }
}

// --- Identity (oversight roles) ---------------------------------------------
export class LocalIdentity {
  name = "local";
  constructor({ roles = {} } = {}) { this.roles = roles; } // { token: [roleNames] }
  async resolveRoles(token) { return this.roles[token] || []; }
}
export class KeycloakIdentity {
  // Introspects an OIDC token and maps realm roles → our five roles via roleMap.
  name = "keycloak";
  constructor({ baseUrl, realm = "aigovops", clientId, clientSecret, roleMap = {}, transport = fetchTransport } = {}) {
    Object.assign(this, { baseUrl, realm, clientId, clientSecret, roleMap, transport });
  }
  async resolveRoles(token) {
    const { status, json } = await this.transport({
      method: "POST",
      url: `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token/introspect`,
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: { token, client_id: this.clientId, client_secret: this.clientSecret },
    });
    if (status !== 200 || !json) throw new Error(`Keycloak ${status}`);
    if (!json.active) return [];
    const realmRoles = json.realm_access?.roles || [];
    return [...new Set(realmRoles.map((r) => this.roleMap[r]).filter(Boolean))];
  }
}

// --- Audit store (Beacon ledger sink) ---------------------------------------
export class LocalAuditStore {
  name = "local";
  constructor() { this.docs = []; }
  async index(receipt) { this.docs.push(receipt); return { ok: true }; }
  async search(predicate = () => true) { return this.docs.filter(predicate); }
}
export class OpenSearchStore {
  name = "opensearch";
  constructor({ baseUrl, index = "aigovops-evidence", transport = fetchTransport } = {}) {
    this.baseUrl = baseUrl;
    this.indexName = index; // not `this.index` — that would clobber the index() method
    this.transport = transport;
  }
  async index(receipt) {
    const { status } = await this.transport({ method: "POST", url: `${this.baseUrl}/${this.indexName}/_doc`, body: receipt });
    if (status >= 300) throw new Error(`OpenSearch index ${status}`);
    return { ok: true };
  }
  async search(query) {
    const { status, json } = await this.transport({ method: "POST", url: `${this.baseUrl}/${this.indexName}/_search`, body: query });
    if (status !== 200 || !json) throw new Error(`OpenSearch search ${status}`);
    return (json.hits?.hits || []).map((h) => h._source);
  }
}

// --- Gateway (Layer-3 chokepoint) -------------------------------------------
export class LocalGateway {
  name = "local";
  async route({ service, upstream }) { return { mode: "in-process", service, upstream, plugin: "aigovops-gate" }; }
}
export class KongGateway {
  // Produces declarative Kong config routing model calls through the gate plugin.
  name = "kong";
  async route({ service, upstream, gateUrl }) {
    return {
      _format_version: "3.0",
      services: [{ name: service, url: upstream, routes: [{ name: `${service}-route`, paths: [`/${service}`] }],
        plugins: [{ name: "pre-function", config: { access: [`-- route every call through ${gateUrl}`] } }] }],
    };
  }
}

// --- tier → backend selection (mirrors install's tier map) ------------------
export function selectBackends(tier, endpoints = {}) {
  const heavy = tier >= 4;
  return {
    policy: heavy ? new OpaPolicy(endpoints.opa || {}) : new LocalPolicy(),
    drift: heavy ? new PrometheusDrift(endpoints.prometheus || {}) : new LocalDrift(),
    identity: heavy ? new KeycloakIdentity(endpoints.keycloak || {}) : new LocalIdentity(endpoints.localIdentity || {}),
    audit: heavy ? new OpenSearchStore(endpoints.opensearch || {}) : new LocalAuditStore(),
    gateway: heavy ? new KongGateway() : new LocalGateway(),
  };
}
