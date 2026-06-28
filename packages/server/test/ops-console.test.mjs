import { test } from "node:test";
import assert from "node:assert/strict";
import { handle } from "../src/index.mjs";

const json = (r) => r.json;
const get = (path) => handle({ method: "GET", path });
const post = (path, body) => handle({ method: "POST", path, body });

test("the approvals console is served", async () => {
  const r = await get("/approvals");
  assert.equal(r.status, 200);
  assert.match(r.html, /Go-live approvals/);
  assert.match(r.html, /\/v1\/ops\/approve/); // the page drives the real runbook
});

test("the live runbook stops at gate 1, and approvals advance it through all four gates", async () => {
  let s = json(await post("/v1/ops/reset"));
  assert.equal(s.gateProgress.total, 4);
  assert.equal(s.gate, "registry-public");                         // parked at gate 1
  assert.equal(s.complete, false);

  s = json(await post("/v1/ops/approve", { id: "registry-public" }));
  assert.equal(s.steps.find((x) => x.id === "registry-public").status, "done");
  assert.equal(s.steps.find((x) => x.id === "observability").status, "done"); // agent auto-ran the reversible step
  assert.equal(s.gate, "provision");                               // next human gate

  s = json(await post("/v1/ops/approve", { id: "provision" }));
  // the credentialed auto steps (deploy/sign/billing/npm) all ran
  for (const id of ["deploy", "desktop-sign", "stripe-wire", "npm-publish"]) assert.equal(s.steps.find((x) => x.id === id).status, "done");
  assert.equal(s.gate, "dns");

  s = json(await post("/v1/ops/approve", { id: "dns" }));
  assert.equal(s.gate, "golive");

  s = json(await post("/v1/ops/approve", { id: "golive" }));
  assert.equal(s.complete, true);
  assert.equal(s.gateProgress.approved, 4);
});

test("a credentialed step carries its 1Password needs for the console chips", async () => {
  const s = json(await post("/v1/ops/reset"));
  assert.deepEqual(s.steps.find((x) => x.id === "npm-publish").needs, ["npm-token"]);
});
