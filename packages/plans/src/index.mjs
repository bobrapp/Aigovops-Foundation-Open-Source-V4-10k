// M15 — plans & entitlements (open-core).
//
// The product is MIT-licensed and fully self-hostable forever — `selfhost` is unlimited and free.
// The hosted SaaS tiers exist only to fund the Foundation and to offer a zero-ops demo; they never
// gate the open-source code, only the *hosted* service's quotas. No lock-in: a hosted tenant can
// export everything and run the identical stack on-prem at any time.
const U = Infinity;

export const PLANS = {
  free: {
    id: "free", name: "Free / Demo", price: 0, blurb: "Kick the tires on our hosted demo.",
    seats: 1, limits: { decisionsPerMonth: 1000, gates: 25, policies: 3 },
    features: ["wizard", "studio", "gate", "drift", "improve", "author"],
  },
  team: {
    id: "team", name: "Team", price: 49, blurb: "For a team putting AI into production.",
    seats: 10, limits: { decisionsPerMonth: 100000, gates: 500, policies: 50 },
    features: ["wizard", "studio", "gate", "drift", "improve", "author", "attestation", "profiles", "alerts", "identity"],
  },
  enterprise: {
    id: "enterprise", name: "Enterprise", price: null, blurb: "Scale, SSO, and a support SLA.",
    seats: U, limits: { decisionsPerMonth: U, gates: U, policies: U }, features: ["*"],
  },
  selfhost: {
    id: "selfhost", name: "Self-hosted", price: 0, blurb: "Your infra, your keys, forever free.",
    seats: U, limits: { decisionsPerMonth: U, gates: U, policies: U }, features: ["*"],
  },
};

export function planFor(id) { return PLANS[id] || PLANS.free; }

export function can(plan, feature) {
  const p = typeof plan === "string" ? planFor(plan) : plan;
  return p.features.includes("*") || p.features.includes(feature);
}

/** Is `used` of `metric` still within the plan's limit? Unlimited (Infinity) is always within. */
export function withinQuota(plan, metric, used) {
  const p = typeof plan === "string" ? planFor(plan) : plan;
  const lim = p.limits[metric];
  return lim === undefined ? true : used < lim;
}

export function entitlement(plan) {
  const p = typeof plan === "string" ? planFor(plan) : plan;
  return { plan: p.id, name: p.name, seats: p.seats, limits: p.limits, features: p.features };
}
