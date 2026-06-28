import { test } from "node:test";
import assert from "node:assert/strict";
import { opsPlan, OpsAgent, toProposal } from "../src/index.mjs";
import { Jeeves, route } from "../../../jeeves/src/manager.mjs";

test("the plan opens with the access-control gate and ends with go-live", () => {
  const plan = opsPlan();
  assert.equal(plan.steps[0].id, "registry-public");
  assert.equal(plan.steps[0].kind, "gate");
  assert.equal(plan.steps.at(-1).id, "golive");
  assert.equal(plan.steps.at(-1).kind, "gate");
});

test("every irreversible gate carries a humanAction; no auto step asks for approval", () => {
  const plan = opsPlan({ host: "vps", domain: "app.example.com", desktop: true, saas: true, npm: true });
  for (const s of plan.steps) {
    if (s.kind === "gate") assert.ok(s.humanAction, `gate ${s.id} must tell the human what to do`);
    else assert.equal(s.humanAction, null, `auto step ${s.id} must not require a human`);
  }
});

test("the agent runs reversible work and STOPS at the first unapproved gate", async () => {
  const ran = [];
  const plan = opsPlan({ registryPublic: false });            // first step is now the auto observability step
  const agent = new OpsAgent({ plan, executors: { observability: (s) => (ran.push(s.id), "stood up") } });

  const blocked = await agent.run();
  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.at, "golive");                          // stopped at the irreversible switch
  assert.deepEqual(ran, ["observability"]);                    // the reversible step did run
  assert.match(blocked.message, /irreversible/i);
});

test("once the human approves the gate, the run completes", async () => {
  const plan = opsPlan({ registryPublic: false });
  const agent = new OpsAgent({ plan });
  agent.approve("golive");
  const done = await agent.run();
  assert.equal(done.status, "complete");
  assert.equal(agent.progress.done, plan.steps.length);
});

test("Jeeves routes ops requests to the ops-runner and returns a gated proposal", async () => {
  assert.equal(route("provision a host and deploy, then go live"), "ops-runner");
  const j = new Jeeves();
  const { agent, result } = await j.manage("do the ops work: release and deploy", { ops: { host: "vps" } });
  assert.equal(agent, "ops-runner");
  assert.equal(result.firstGate.id, "registry-public");
  assert.match(result.proposal, /HUMAN GATE/);
  // the ops-runner is a registered, Jeeves-managed sub-agent
  assert.ok(j.status().agents.some((a) => a.id === "ops-runner"));
});
