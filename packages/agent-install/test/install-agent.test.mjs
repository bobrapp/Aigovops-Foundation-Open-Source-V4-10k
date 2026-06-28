import { test } from "node:test";
import assert from "node:assert/strict";
import { installPlan, JeevesInstaller, toProposal } from "../src/index.mjs";

test("local install has no provisioning gate; only go-live is a gate", () => {
  const plan = installPlan({ tier: 4, target: "local" });
  const gates = plan.steps.filter((s) => s.kind === "gate").map((s) => s.id);
  assert.deepEqual(gates, ["golive"]);
  assert.ok(plan.steps.find((s) => s.id === "deploy").kind === "auto");
});

test("cloud install adds provision + account gates; domain adds a DNS gate", () => {
  const plan = installPlan({ tier: 6, target: "cloud", domain: "gov.example.com" });
  const gates = plan.steps.filter((s) => s.kind === "gate").map((s) => s.id);
  assert.deepEqual(gates, ["provision", "account", "dns", "golive"]);
  for (const g of plan.steps.filter((s) => s.kind === "gate")) assert.ok(g.humanAction, `${g.id} must state the human action`);
});

test("the installer auto-runs reversible steps and BLOCKS at the first unapproved gate", async () => {
  const ran = [];
  const executors = new Proxy({}, { get: () => (s) => ran.push(s.id) });
  const inst = new JeevesInstaller({ plan: installPlan({ target: "cloud" }), executors });
  const r1 = await inst.run();
  assert.equal(r1.status, "blocked");
  assert.equal(r1.at, "provision");          // stops at the first irreversible step
  assert.deepEqual(ran, ["detect"]);          // only the reversible step before it ran
  assert.ok(r1.message);                      // tells the human what to do
});

test("approving each gate lets it continue to completion", async () => {
  const inst = new JeevesInstaller({ plan: installPlan({ target: "cloud", domain: "g.example" }) });
  inst.approve("provision").approve("account").approve("dns").approve("golive");
  const r = await inst.run();
  assert.equal(r.status, "complete");
  assert.equal(r.completed.length, inst.plan.steps.length);
});

test("a single missing approval halts the whole run (fail-closed on irreversibility)", async () => {
  const inst = new JeevesInstaller({ plan: installPlan({ target: "cloud" }) });
  inst.approve("provision"); // but NOT account
  const r = await inst.run();
  assert.equal(r.status, "blocked");
  assert.equal(r.at, "account");
});

test("toProposal labels gates distinctly", () => {
  const p = toProposal(installPlan({ target: "cloud" }));
  assert.match(p, /HUMAN GATE\] Provision the host/);
  assert.match(p, /auto\] Deploy the stack/);
});
