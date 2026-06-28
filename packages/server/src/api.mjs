// M9 — the unified gate as a service. Pure request router (testable without a socket).
// Exposes the whole product surface over one contract any language can call.
import { decide } from "../../gate/src/index.mjs";
import { improve } from "../../policy-improver/src/index.mjs";
import { authorPolicy } from "../../gate-author/src/index.mjs";
import { compare } from "../../side-by-side/src/index.mjs";

export const OPENAPI = {
  openapi: "3.0.0",
  info: { title: "AiGovOps Gate API", version: "4.0.0", description: "Get to YES. Stay at YES. Recover to YES." },
  paths: {
    "/v1/decide": { post: { summary: "Run the unified gate (criteria → drift → caps → human → sign → broker)" } },
    "/v1/improve": { post: { summary: "Improve a written policy against the regulatory corpus" } },
    "/v1/author": { post: { summary: "Author runnable gates from a written policy" } },
    "/v1/compare": { post: { summary: "Governed vs. ungoverned comparison" } },
  },
};

/** @returns {{status, json}} */
export async function handle({ method, path, body } = {}) {
  if (method === "GET" && path === "/healthz") return { status: 200, json: { ok: true, service: "aigovops-gate", version: "4.0.0" } };
  if (method === "GET" && path === "/openapi.json") return { status: 200, json: OPENAPI };

  if (method === "POST" && path === "/v1/decide") return ok(decide(body || {}));
  if (method === "POST" && path === "/v1/improve") return ok(improve(body?.policyText || "", body?.context || {}));
  if (method === "POST" && path === "/v1/author") return ok(authorPolicy(improve(body?.policyText || "", body?.context || {})));
  if (method === "POST" && path === "/v1/compare") return ok(compare(body || {}));

  return { status: 404, json: { error: "not found" } };
}

function ok(json) {
  try { return { status: 200, json }; }
  catch (e) { return { status: 400, json: { error: e.message } }; }
}
