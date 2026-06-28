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
