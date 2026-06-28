// M9 — the unified gate as a service + the Studio UX surface. Pure request router.
// Exposes the whole product, and the production capabilities of each version (M6–M9), over one
// contract any language — or the built-in web Studio — can call.
import { decide } from "../../gate/src/index.mjs";
import { improve } from "../../policy-improver/src/index.mjs";
import { authorPolicy } from "../../gate-author/src/index.mjs";
import { compare } from "../../side-by-side/src/index.mjs";
import { compileFrameworkProfile, availableProfiles } from "../../umbrella/src/index.mjs";          // M8
import { attest, verifyDsse, toInTotoStatement, generateKeypair } from "../../beacon/src/index.mjs"; // M6
import { distributionDrift } from "../../lantern/src/index.mjs";                                     // M7
import { runConformance } from "../../conformance/src/index.mjs";                                    // M9
import { studioHTML } from "./studio.mjs";
import { wizardHTML } from "./wizard.mjs"; // M11
import { inc, renderMetrics } from "./metrics.mjs"; // M14
import { pricingHTML } from "./pricing.mjs"; // M15
import { tenantFor, accountFor, meterDecision, billing } from "./saas.mjs"; // M15
import { recordDecision, listEvidence, verifyEvidence, evidenceBundle } from "./evidence.mjs"; // M16
import { recentSpans } from "./trace.mjs"; // M17

export const OPENAPI = {
  openapi: "3.0.0",
  info: { title: "AiGovOps Gate API", version: "4.0.0", description: "Get to YES. Stay at YES. Recover to YES." },
  paths: {
    "/v1/decide": { post: { summary: "Run the unified gate" } },
    "/v1/improve": { post: { summary: "Improve a written policy against the regulatory corpus" } },
    "/v1/author": { post: { summary: "Author runnable gates from a written policy" } },
    "/v1/compare": { post: { summary: "Governed vs. ungoverned comparison" } },
    "/v1/profiles": { post: { summary: "Frameworks available for a context (M8)" } },
    "/v1/profile": { post: { summary: "Compile a framework profile to runnable gates (M8)" } },
    "/v1/attest": { post: { summary: "in-toto/SLSA DSSE attestation over a receipt (M6)" } },
    "/v1/drift": { post: { summary: "Distributional drift: PSI / KL / KS (M7)" } },
    "/v1/conformance": { get: { summary: "Run the conformance suite (M9)" } },
    "/v1/evidence": { get: { summary: "Query the hash-chained evidence vault, role-scoped (M16)" } },
    "/v1/evidence/bundle": { post: { summary: "Signed audit / DSAR evidence bundle (M16)" } },
    "/v1/account": { get: { summary: "Tenant plan, entitlement & usage (M15)" } },
    "/pricing": { get: { summary: "Plans — hosted & self-hosted (M15)" } },
  },
};

/** @returns {{status, json?} | {status, html} | {status, text}} */
export async function handle({ method, path, body, headers, host } = {}) {
  const tenant = tenantFor({ headers, host }); // M15 — "local" off-cloud, the SaaS tenant when hosted
  if (method === "GET" && (path === "/" || path === "/setup")) return { status: 200, html: wizardHTML() }; // policy folks land on the wizard
  if (method === "GET" && path === "/studio") return { status: 200, html: studioHTML() };                  // developers
  if (method === "GET" && path === "/pricing") return { status: 200, html: pricingHTML() };                // M15
  if (method === "GET" && path === "/healthz") return { status: 200, json: { ok: true, service: "aigovops-gate", version: "4.0.0" } };
  if (method === "GET" && path === "/openapi.json") return { status: 200, json: OPENAPI };
  if (method === "GET" && path === "/v1/account") return { status: 200, json: accountFor(tenant) };         // M15
  if (method === "GET" && path === "/v1/evidence") return run(() => listEvidence({ tenant, role: headers?.["x-aigovops-role"] || "steward", actor: headers?.["x-aigovops-actor"] })); // M16
  if (method === "GET" && path === "/v1/evidence/verify") return run(() => verifyEvidence({ tenant }));     // M16
  if (method === "GET" && path === "/v1/conformance") return run(() => runConformance());
  if (method === "GET" && path === "/v1/metrics") return { status: 200, text: renderMetrics({ aigovops_up: 1, aigovops_conformance_passed: runConformance().passed }) }; // M14
  if (method === "GET" && path === "/v1/traces") return { status: 200, json: recentSpans() }; // M17

  if (method !== "POST") return { status: 404, json: { error: "not found" } };
  const b = body || {};
  switch (path) {
    case "/v1/decide": {
      const q = meterDecision(tenant); // M15 — meter usage; gate only in hosted mode
      if (!q.allowed) return { status: 402, json: { error: "monthly decision quota reached for this plan", upgrade: "/pricing", used: q.used, limit: q.limit } };
      return runAsync(async () => {
        const r = decide(b);
        inc("aigovops_decisions_total"); inc(r.status === "PASS" ? "aigovops_decisions_pass" : "aigovops_decisions_fail");
        if (r.receipt) await recordDecision({ tenant, receipt: r.receipt, actor: b.requestedBy || b.actor || "anon" }); // M16
        return r;
      });
    }
    case "/v1/billing/checkout": return runAsync(() => billing.checkout({ tenant, plan: b.plan || "team" })); // M15
    case "/v1/evidence/bundle": return run(() => evidenceBundle({ tenant, subject: b.subject })); // M16 — signed audit/DSAR bundle
    case "/v1/improve": return run(() => { inc("aigovops_improve_total"); return improve(b.policyText || "", b.context || {}); });
    case "/v1/author": return run(() => authorPolicy(improve(b.policyText || "", b.context || {})));
    case "/v1/compare": return runAsync(async () => { inc("aigovops_compare_total"); const c = compare(b); if (c.governed?.receipt) await recordDecision({ tenant, receipt: c.governed.receipt, actor: b.actor || "studio", action: "compare" }); return c; }); // M16
    case "/v1/profiles": return run(() => ({ frameworks: availableProfiles(b.context || {}) }));
    case "/v1/profile": return run(() => compileFrameworkProfile(b.framework, b.context || {}));
    case "/v1/drift": return run(() => distributionDrift({ baseline: b.baseline, current: b.current, method: b.method || "psi" }));
    case "/v1/attest": return run(() => attestReceipt(b.receipt));
    default: return { status: 404, json: { error: "not found" } };
  }
}

function attestReceipt(receipt) {
  if (!receipt) throw new Error("attest requires a receipt");
  const { privateKey, publicKey } = generateKeypair();
  const statement = toInTotoStatement(receipt);
  const envelope = attest(receipt, privateKey);
  return { statement, envelope, publicKey, verified: verifyDsse(envelope, publicKey) };
}

function run(fn) {
  try { return { status: 200, json: fn() }; }
  catch (e) { return { status: 400, json: { error: e.message } }; }
}

async function runAsync(fn) {
  try { return { status: 200, json: await fn() }; }
  catch (e) { return { status: 400, json: { error: e.message } }; }
}
