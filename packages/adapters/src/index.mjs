// M4 — heavyweight adapters, production-hardened. One contract per capability; a local
// (zero-dep) default and a shim that maps a production backend's response into the SAME shape.
// Define the safety contract once; enforce it with the strongest backend each environment allows.
//
// Every shim takes an injectable `transport({method,url,headers,body}) → {status,json}`
// (defaults to fetch with a timeout) so the request-building + response-mapping logic is
// unit-testable against canned responses — no live service, no runtime dependency. Hardening:
// per-call timeout, retry-with-backoff on 5xx/network, typed AdapterError, auth headers, health().
import { compile } from "../../umbrella/src/index.mjs";
import { detectDrift } from "../../lantern/src/index.mjs";

export class AdapterError extends Error {
  constructor(message, { status, adapter, cause } = {}) {
    super(message);
    this.name = "AdapterError";
    this.status = status ?? null;
    this.adapter = adapter ?? null;
    this.cause = cause ?? null;
  }
}

/** Default transport: fetch with an AbortController timeout. */
export function fetchTransport({ method = "GET", url, headers = {}, body, timeoutMs = 5000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(url, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body != null ? JSON.stringify(body) : undefined,
    signal: ctrl.signal,
  })
    .then(async (res) => {
      let json = null;
      try { json = await res.json(); } catch { /* non-JSON */ }
      return { status: res.status, json };
    })
    .finally(() => clearTimeout(timer));
}

// Shared retry/backoff wrapper used by every heavyweight adapter.
async function call(self, req) {
  const { transport, name, retries = 2, backoffMs = 200, headers = {}, timeoutMs = 5000 } = self;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await transport({ ...req, timeoutMs, headers: { ...headers, ...req.headers } });
      if (res.status >= 500) throw new AdapterError(`${name} returned ${res.status}`, { status: res.status, adapter: name });
      return res; // 2xx–4xx returned to the adapter to map
    } catch (e) {
      lastErr = e instanceof AdapterError ? e : new AdapterError(`${name} transport error: ${e.message}`, { adapter: name, cause: e });
      if (attempt < retries && backoffMs) await new Promise((r) => setTimeout(r, backoffMs * (attempt + 1)));
    }
  }
  throw lastErr;
}

const opts = (o) => ({ retries: 2, backoffMs: 200, timeoutMs: 5000, headers: {}, transport: fetchTransport, ...o });

// --- Policy (Umbrella backend) ----------------------------------------------
export class LocalPolicy {
  name = "local";
  async evaluate({ policy, payload }) { return compile(policy).evaluate(payload ?? {}); }
  async health() { return true; }
}
export class OpaPolicy {
  name = "opa";
  constructor(o = {}) { Object.assign(this, opts(o), { pkg: o.pkg || "aigovops/authz" }); }
  async evaluate({ payload }) {
    const { status, json } = await call(this, { method: "POST", url: `${this.baseUrl}/v1/data/${this.pkg}`, body: { input: payload ?? {} } });
    if (status !== 200 || !json) throw new AdapterError(`OPA eval ${status}`, { status, adapter: this.name });
    const r = json.result || {};
    const violations = (r.violations || []).map((v) => (typeof v === "string" ? { path: v, message: v } : v));
    return { status: r.allow === true && violations.length === 0 ? "PASS" : "FAIL", violations };
  }
  async health() { return (await call(this, { url: `${this.baseUrl}/health` })).status === 200; }
}

// --- Drift (Lantern backend) ------------------------------------------------
export class LocalDrift {
  name = "local";
  async check({ baseline, current, tolerance }) { return detectDrift({ baseline, current, tolerance }); }
  async health() { return true; }
}
export class PrometheusDrift {
  name = "prometheus";
  constructor(o = {}) { Object.assign(this, opts(o)); }
  async check({ query, baseline, tolerance = 0 }) {
    const { status, json } = await call(this, { url: `${this.baseUrl}/api/v1/query?query=${encodeURIComponent(query)}` });
    if (status !== 200 || json?.status !== "success") throw new AdapterError(`Prometheus query ${status}`, { status, adapter: this.name });
    const current = Number(json.data?.result?.[0]?.value?.[1]);
    const drifted = Math.abs(current - baseline) / Math.max(Math.abs(baseline), 1e-9) > tolerance;
    return { status: drifted ? "FAIL" : "PASS", current, baseline, drift: drifted ? [{ query, from: baseline, to: current }] : [] };
  }
  async health() { return (await call(this, { url: `${this.baseUrl}/-/healthy` })).status === 200; }
}
export class JaegerTraces {
  // Pulls recent traces for a service and reports the error rate — a trace-level drift signal.
  name = "jaeger";
  constructor(o = {}) { Object.assign(this, opts(o)); }
  async errorRate({ service, lookback = "1h" }) {
    const { status, json } = await call(this, { url: `${this.baseUrl}/api/traces?service=${encodeURIComponent(service)}&lookback=${lookback}` });
    if (status !== 200 || !json) throw new AdapterError(`Jaeger ${status}`, { status, adapter: this.name });
    const traces = json.data || [];
    const errored = traces.filter((t) => (t.spans || []).some((s) => (s.tags || []).some((tag) => tag.key === "error" && tag.value === true))).length;
    return { service, total: traces.length, errored, rate: traces.length ? errored / traces.length : 0 };
  }
  async health() { return (await call(this, { url: `${this.baseUrl}/` })).status < 500; }
}

// --- Identity (oversight roles) ---------------------------------------------
export class LocalIdentity {
  name = "local";
  constructor({ roles = {} } = {}) { this.roles = roles; }
  async resolveRoles(token) { return this.roles[token] || []; }
  async health() { return true; }
}
export class KeycloakIdentity {
  name = "keycloak";
  constructor(o = {}) { Object.assign(this, opts(o), { realm: o.realm || "aigovops", clientId: o.clientId, clientSecret: o.clientSecret, roleMap: o.roleMap || {} }); }
  async resolveRoles(token) {
    const { status, json } = await call(this, {
      method: "POST",
      url: `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token/introspect`,
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: { token, client_id: this.clientId, client_secret: this.clientSecret },
    });
    if (status !== 200 || !json) throw new AdapterError(`Keycloak introspect ${status}`, { status, adapter: this.name });
    if (!json.active) return [];
    return [...new Set((json.realm_access?.roles || []).map((r) => this.roleMap[r]).filter(Boolean))];
  }
  async health() { return (await call(this, { url: `${this.baseUrl}/realms/${this.realm}` })).status === 200; }
}

// --- Audit store (Beacon ledger sink) ---------------------------------------
export class LocalAuditStore {
  name = "local";
  constructor() { this.docs = []; }
  async index(receipt) { this.docs.push(receipt); return { ok: true }; }
  async search(predicate = () => true) { return this.docs.filter(predicate); }
  async health() { return true; }
}
export class OpenSearchStore {
  name = "opensearch";
  constructor(o = {}) { Object.assign(this, opts(o), { indexName: o.index || "aigovops-evidence" }); }
  async index(receipt) {
    const { status } = await call(this, { method: "POST", url: `${this.baseUrl}/${this.indexName}/_doc`, body: receipt });
    if (status >= 300) throw new AdapterError(`OpenSearch index ${status}`, { status, adapter: this.name });
    return { ok: true };
  }
  async search(query) {
    const { status, json } = await call(this, { method: "POST", url: `${this.baseUrl}/${this.indexName}/_search`, body: query });
    if (status !== 200 || !json) throw new AdapterError(`OpenSearch search ${status}`, { status, adapter: this.name });
    return (json.hits?.hits || []).map((h) => h._source);
  }
  async health() { return (await call(this, { url: `${this.baseUrl}/_cluster/health` })).status === 200; }
}

// --- Gateway (Layer-3 chokepoint) -------------------------------------------
export class LocalGateway {
  name = "local";
  async route({ service, upstream }) { return { mode: "in-process", service, upstream, plugin: "aigovops-gate" }; }
  async health() { return true; }
}
export class KongGateway {
  name = "kong";
  async route({ service, upstream, gateUrl }) {
    return {
      _format_version: "3.0",
      services: [{ name: service, url: upstream, routes: [{ name: `${service}-route`, paths: [`/${service}`] }],
        plugins: [{ name: "pre-function", config: { access: [`-- route every call through ${gateUrl}`] } }] }],
    };
  }
  async health() { return true; }
}

// --- Security gates (parse scanner output → gate shape) ---------------------
// Scanners run in CI and emit JSON; these turn that report into PASS/FAIL on a severity threshold.
export class TrivyGate {
  name = "trivy";
  constructor({ failOn = ["CRITICAL", "HIGH"] } = {}) { this.failOn = failOn; }
  evaluate(report = {}) {
    const vulns = (report.Results || []).flatMap((r) => r.Vulnerabilities || []);
    const blocking = vulns.filter((v) => this.failOn.includes(v.Severity));
    return { status: blocking.length ? "FAIL" : "PASS", findings: blocking.length, total: vulns.length, mitigation: blocking.length ? [`Resolve ${blocking.length} ${this.failOn.join("/")} vulnerabilities.`] : [] };
  }
}
export class ZapGate {
  name = "zap";
  constructor({ failOnRisk = 3 } = {}) { this.failOnRisk = failOnRisk; } // ZAP riskcode: 3=High, 2=Medium
  evaluate(report = {}) {
    const alerts = (report.site || []).flatMap((s) => s.alerts || []);
    const blocking = alerts.filter((a) => Number(a.riskcode) >= this.failOnRisk);
    return { status: blocking.length ? "FAIL" : "PASS", findings: blocking.length, total: alerts.length };
  }
}
export class SemgrepGate {
  name = "semgrep";
  constructor({ failOn = ["ERROR"] } = {}) { this.failOn = failOn; }
  evaluate(report = {}) {
    const results = report.results || [];
    const blocking = results.filter((r) => this.failOn.includes(r.extra?.severity));
    return { status: blocking.length ? "FAIL" : "PASS", findings: blocking.length, total: results.length };
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
