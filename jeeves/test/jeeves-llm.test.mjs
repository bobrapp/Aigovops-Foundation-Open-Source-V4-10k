import { test } from "node:test";
import assert from "node:assert/strict";
import { HeuristicLLM, AnthropicLLM, converse, Jeeves, route } from "../src/index.mjs";
import { frameworks } from "../../packages/corpus/src/index.mjs";

test("HeuristicLLM infers context from free text", async () => {
  const ctx = await new HeuristicLLM().extractContext("Our EU school runs an AI tutor for students");
  assert.equal(ctx.sector, "education");
  assert.equal(ctx.jurisdiction, "EU");
  assert.ok(ctx.dataTypes.includes("children"));
});

test("converse (offline) returns cited gaps and a grounded reply that invents nothing", async () => {
  const out = await converse("We use an AI tutor and tell students it is AI.", { context: { sector: "education", jurisdiction: "EU", dataTypes: ["children"], riskTier: "high" } });
  assert.ok(out.report.gaps.length > 0);
  assert.ok(out.reply.length > 0);
  // Grounding: any framework the reply names must be one the verified report actually flagged —
  // the conversational surface can't introduce a regulation the deterministic engine didn't.
  const inReport = new Set([...out.report.gaps, ...out.report.strengths].map((e) => e.framework));
  for (const fw of frameworks()) {
    if (out.reply.includes(fw)) assert.ok(inReport.has(fw), `reply named "${fw}" but the report didn't flag it`);
  }
});

test("AnthropicLLM adapter parses a Messages API response (injected fetch, no network)", async () => {
  const fakeFetch = async (_url, opts) => {
    const body = JSON.parse(opts.body);
    assert.equal(body.model, "claude-opus-4-8");
    assert.deepEqual(body.thinking, { type: "adaptive" }); // 4.8 surface
    assert.ok(!("temperature" in body) && !("budget_tokens" in body));
    return { json: async () => ({ stop_reason: "end_turn", content: [{ type: "text", text: "hello from claude" }] }) };
  };
  const llm = new AnthropicLLM({ apiKey: "test", fetchImpl: fakeFetch });
  assert.equal(await llm.narrate({ system: "s", prompt: "p" }), "hello from claude");
});

test("AnthropicLLM surfaces a refusal as an error", async () => {
  const refuse = async () => ({ json: async () => ({ stop_reason: "refusal", content: [] }) });
  await assert.rejects(() => new AnthropicLLM({ apiKey: "t", fetchImpl: refuse }).narrate({ system: "s", prompt: "p" }), /declined/);
});

test("Jeeves routes requests to the right sub-agent", () => {
  assert.equal(route("help me improve my AI policy"), "policy-improver");
  assert.equal(route("encode the gate criteria and exit state"), "gate-author");
  assert.equal(route("has the model drifted from baseline?"), "drift-monitor");
});

test("Jeeves.manage runs the routed agent; status is role-aware", async () => {
  const ledger = { records: [{ actor: "jeeves", status: "PASS" }, { actor: "m1", status: "FAIL" }], killed: false };
  const j = new Jeeves({ ledger });
  const managed = await j.manage("improve this policy", { policyText: "We use an AI tutor.", context: { sector: "education", jurisdiction: "EU", dataTypes: ["children"], riskTier: "high" } });
  assert.equal(managed.agent, "policy-improver");
  assert.ok(managed.result.gaps.length > 0);

  assert.equal(j.status({ role: "steward" }).ledger.visible, 2);
  assert.equal(j.status({ role: "member", actor: "m1" }).ledger.visible, 1);
  assert.equal(j.status({ tier: 4 }).agents.length, 6); // + the ops-runner (M19)
});
