import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { handle, serve, GateClient } from "../src/index.mjs";

const GOOD = {
  profile: "baseline",
  payload: { model: "claude-opus-4-8", humanApproved: true },
  baseline: { cost: 100 }, current: { cost: 102 }, tolerance: 0.05,
};

test("handle() routes the product surface", async () => {
  assert.equal((await handle({ method: "GET", path: "/healthz" })).json.ok, true);
  assert.equal((await handle({ method: "GET", path: "/openapi.json" })).json.info.title, "AiGovOps Gate API");
  assert.equal((await handle({ method: "POST", path: "/v1/decide", body: GOOD })).json.status, "PASS");
  const improved = (await handle({ method: "POST", path: "/v1/improve", body: { policyText: "We use an AI tutor.", context: { sector: "education", jurisdiction: "EU", dataTypes: ["children"], riskTier: "high" } } })).json;
  assert.ok(improved.gaps.length > 0);
  assert.equal((await handle({ method: "GET", path: "/nope" })).status, 404);
});

test("serves the Wizard at /, the Studio at /studio, and the production endpoints (M6–M9)", async () => {
  assert.match((await handle({ method: "GET", path: "/" })).html, /Get your AI governed|Get Governed|get your AI governed/i);   // M11 wizard for policy folks
  assert.match((await handle({ method: "GET", path: "/setup" })).html, /AiGovOps/);
  assert.match((await handle({ method: "GET", path: "/studio" })).html, /AiGovOps Studio/);                                    // developer console

  const EU = { sector: "education", jurisdiction: "EU", dataTypes: ["personal", "children"], riskTier: "high" };
  const profiles = (await handle({ method: "POST", path: "/v1/profiles", body: { context: EU } })).json;
  assert.ok(profiles.frameworks.includes("EU AI Act"));                                   // M8
  const profile = (await handle({ method: "POST", path: "/v1/profile", body: { framework: "EU AI Act", context: EU } })).json;
  assert.ok(profile.policy.rules.length > 0);

  const drift = (await handle({ method: "POST", path: "/v1/drift", body: { baseline: [1, 2, 3, 4, 5], current: [80, 90, 100, 110, 120], method: "ks" } })).json;
  assert.equal(drift.status, "FAIL");                                                     // M7

  const decided = (await handle({ method: "POST", path: "/v1/decide", body: GOOD })).json;
  const attest = (await handle({ method: "POST", path: "/v1/attest", body: { receipt: decided.receipt } })).json;
  assert.equal(attest.verified, true);                                                    // M6

  const conf = (await handle({ method: "GET", path: "/v1/conformance" })).json;
  assert.equal(conf.conformant, true);                                                    // M9
});

test("exposes Prometheus governance metrics that count decisions (M14)", async () => {
  const before = (await handle({ method: "GET", path: "/v1/metrics" })).text;
  assert.match(before, /aigovops_decisions_total/);
  assert.match(before, /aigovops_conformance_passed 6/);
  const n0 = Number(before.match(/aigovops_decisions_total (\d+)/)[1]);
  await handle({ method: "POST", path: "/v1/decide", body: GOOD });
  const after = (await handle({ method: "GET", path: "/v1/metrics" })).text;
  const n1 = Number(after.match(/aigovops_decisions_total (\d+)/)[1]);
  assert.equal(n1, n0 + 1);                       // the counter incremented
  assert.match(after, /aigovops_decisions_pass [1-9]/);
});

test("the live server decides over HTTP and the SDK client round-trips", async () => {
  const server = serve({ port: 0 });
  await once(server, "listening");
  const { port } = server.address();
  try {
    const client = new GateClient({ baseUrl: `http://127.0.0.1:${port}` });
    const r = await client.decide(GOOD);
    assert.equal(r.status, "PASS");
    assert.ok(r.receipt);
    const report = await client.improve("We use an AI tutor.", { sector: "education", jurisdiction: "EU", dataTypes: ["children"], riskTier: "high" });
    assert.ok(report.gaps.length > 0);
  } finally {
    server.close();
    await once(server, "close");
  }
});
