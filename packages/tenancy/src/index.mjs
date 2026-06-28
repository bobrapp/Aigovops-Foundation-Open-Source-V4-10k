// M15 — multi-tenancy. Only relevant for the hosted SaaS; self-host is a single, unlimited
// "local" tenant on the selfhost plan, so the gating below never fires off-cloud.
import { randomUUID } from "node:crypto";

const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export class TenantRegistry {
  constructor({ now } = {}) {
    this.now = now || (() => Date.now());
    this.tenants = new Map();
    // The always-present self-host tenant — unlimited, no billing.
    this.tenants.set("local", { id: "local", name: "Self-hosted", plan: "selfhost", createdAt: this.now() });
  }

  create({ name, plan = "free", id } = {}) {
    const tid = id || slug(name) || randomUUID();
    const t = { id: tid, name: name || tid, plan, createdAt: this.now() };
    this.tenants.set(tid, t);
    return t;
  }

  get(id) { return this.tenants.get(id) || null; }
  list() { return [...this.tenants.values()]; }
  setPlan(id, plan) { const t = this.get(id); if (!t) throw new Error(`no tenant '${id}'`); t.plan = plan; return t; }
}

/** Resolve the tenant id from a request. Self-host (not hosted) is always "local". */
export function resolveTenant(req = {}, { hostedMode = false } = {}) {
  if (!hostedMode) return "local";
  const h = req.headers || {};
  if (h["x-aigovops-tenant"]) return h["x-aigovops-tenant"];
  const host = req.host || h.host || "";
  const sub = host.split(":")[0].split(".")[0];
  return sub && sub !== "www" && sub !== "app" ? sub : "demo";
}

/** Per-tenant usage counters that feed quota checks and billing. */
export class UsageMeter {
  constructor() { this.usage = new Map(); }
  record(tenant, metric, n = 1) {
    const u = this.usage.get(tenant) || {};
    u[metric] = (u[metric] || 0) + n;
    this.usage.set(tenant, u);
    return u[metric];
  }
  get(tenant, metric) {
    const u = this.usage.get(tenant) || {};
    return metric ? u[metric] || 0 : { ...u };
  }
  reset(tenant) { this.usage.delete(tenant); }
}
