// M15 — the hosted-SaaS layer for the gate server. OFF by default: without AIGOVOPS_HOSTED=1 every
// request is the single unlimited "local" tenant, so self-host / lab / on-device behave exactly as
// before. Hosted mode adds per-tenant resolution, usage metering, and quota gating.
import { TenantRegistry, resolveTenant, UsageMeter } from "../../tenancy/src/index.mjs";
import { planFor, entitlement } from "../../plans/src/index.mjs";
import { LocalBilling, StripeBilling } from "../../billing/src/index.mjs";

export const registry = new TenantRegistry();
export const meter = new UsageMeter();

export const billing = process.env.AIGOVOPS_STRIPE_KEY
  ? new StripeBilling({ apiKey: process.env.AIGOVOPS_STRIPE_KEY, priceIds: { team: process.env.AIGOVOPS_STRIPE_PRICE_TEAM } })
  : new LocalBilling();

export const hostedMode = () => process.env.AIGOVOPS_HOSTED === "1";

export function tenantFor({ headers, host } = {}) {
  return resolveTenant({ headers, host }, { hostedMode: hostedMode() });
}

export function accountFor(tenantId) {
  const t = registry.get(tenantId) || registry.get("local");
  return { tenant: t.id, name: t.name, plan: t.plan, entitlement: entitlement(t.plan), usage: meter.get(t.id), hosted: hostedMode() };
}

/** Record a decision for the tenant and report whether it's within the (hosted) quota. */
export function meterDecision(tenantId) {
  const t = registry.get(tenantId) || registry.get("local");
  const used = meter.record(t.id, "decisionsPerMonth");
  const limit = planFor(t.plan).limits.decisionsPerMonth;
  return { allowed: !hostedMode() || used <= limit, used, limit };
}
