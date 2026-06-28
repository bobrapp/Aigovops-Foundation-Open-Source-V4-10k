import { test } from "node:test";
import assert from "node:assert/strict";
import { opsPlan, OpsRunbook } from "../src/index.mjs";
import { SecretsProvider, OnePasswordProvider } from "../../secrets/src/index.mjs";

// A fake 1Password Connect backing a real governed broker.
function brokerWith(items) {
  const transport = async ({ url }) => {
    const u = decodeURIComponent(url);
    const m = u.match(/title eq "([^"]+)"/);
    if (m) return items[m[1]] ? { status: 200, json: [{ id: m[1], title: m[1] }] } : { status: 200, json: [] };
    const mi = u.match(/\/items\/([^/?]+)$/);
    return mi && items[mi[1]] ? { status: 200, json: { id: mi[1], fields: [{ label: "credential", value: items[mi[1]] }] } } : { status: 404, json: null };
  };
  return new SecretsProvider([new OnePasswordProvider({ host: "https://op", token: "t", vault: "v", transport })]);
}

test("the runbook auto-resolves credentials from 1Password — no manual credential step", async () => {
  const broker = brokerWith({ "npm-token": "npm_live_xyz" });
  const plan = opsPlan({ registryPublic: false, npm: true }); // observability(auto) · npm-publish(auto, needs npm-token) · golive(gate)
  const used = [];
  const rb = new OpsRunbook({ plan, broker, executors: { "npm-publish": (_s, secrets) => (used.push(secrets["npm-token"]), "published") } });
  rb.approve("golive");

  const out = await rb.run();
  assert.equal(out.status, "complete");
  assert.deepEqual(used, ["npm_live_xyz"]);                       // the agent pulled the token itself
  const npm = out.completed.find((c) => c.id === "npm-publish");
  assert.deepEqual(npm.used, ["npm-token"]);                      // credential resolved via the governed broker
});

test("a not-yet-stored credential blocks with a one-time setup instruction (not a per-run paste)", async () => {
  const broker = brokerWith({});                                  // nothing in 1Password yet
  const plan = opsPlan({ registryPublic: false, npm: true });
  const rb = new OpsRunbook({ plan, broker }).approve("golive");
  const out = await rb.run();
  assert.equal(out.status, "blocked");
  assert.equal(out.reason, "credential");
  assert.equal(out.missing, "npm-token");
  assert.match(out.message, /Store "npm-token" in 1Password once/);
});

test("irreversible gates still stop the agent, credentials notwithstanding", async () => {
  const broker = brokerWith({ "deploy-ssh-key": "ssh-key" });
  const plan = opsPlan({ registryPublic: true, host: "vps" });    // registry-public is a gate, first
  const out = await new OpsRunbook({ plan, broker }).run();
  assert.equal(out.status, "blocked");
  assert.equal(out.reason, "gate");
  assert.equal(out.at, "registry-public");
});

test("credential entry is no longer a manual gate — only irreversible actions are", () => {
  const plan = opsPlan({ host: "vps", domain: "d", desktop: true, saas: true, npm: true });
  const gateIds = plan.steps.filter((s) => s.kind === "gate").map((s) => s.id);
  // exactly the irreversible/outward actions remain manual:
  assert.deepEqual(gateIds, ["registry-public", "provision", "dns", "golive"]);
  // and the credential-bearing steps are all automated:
  assert.ok(plan.steps.find((s) => s.id === "stripe-wire").kind === "auto");
  assert.ok(plan.steps.find((s) => s.id === "desktop-sign").kind === "auto");
});
