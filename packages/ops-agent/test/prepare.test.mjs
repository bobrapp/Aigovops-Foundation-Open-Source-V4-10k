import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { opsPlan, prepareStep, readyForHuman } from "../src/index.mjs";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

test("every auto step is fully engineered with a runnable command", () => {
  const plan = opsPlan({ host: "vps", domain: "app.aigovops.org", desktop: true, saas: true, npm: true });
  const r = readyForHuman(plan, { ip: "203.0.113.7" });
  assert.equal(r.allAutoEngineered, true);
  for (const s of r.steps.filter((x) => x.kind === "auto")) assert.ok(s.prepared.command, `${s.id} needs a command`);
});

test("every human gate arrives staged — action, and the exact place to act", () => {
  const plan = opsPlan({ host: "vps", domain: "app.aigovops.org" });
  const r = readyForHuman(plan, { ip: "203.0.113.7" });
  assert.deepEqual(r.gates.map((g) => g.id), ["registry-public", "provision", "dns", "golive"]);
  for (const g of r.gates) assert.ok(g.humanAction, `${g.id} must tell the human what to do`);
  assert.match(r.gates.find((g) => g.id === "registry-public").link, /packages\/container\/aigovops\/settings/);
  assert.match(r.gates.find((g) => g.id === "provision").link, /digitalocean/);
});

test("the DNS gate prepares the exact A record from the provisioned IP", () => {
  const dns = prepareStep({ id: "dns" }, { domain: "app.aigovops.org", ip: "203.0.113.7" });
  assert.deepEqual(dns.record, { type: "A", name: "app.aigovops.org", value: "203.0.113.7", ttl: 300 });
});

test("engineered steps point at real, committed artifacts that exist on disk", () => {
  for (const id of ["observability", "provision", "deploy", "desktop-sign", "stripe-wire"]) {
    const p = prepareStep({ id }, {}).artifactPath;
    assert.ok(p, `${id} should reference an artifact`);
    assert.ok(existsSync(repoRoot + p), `${p} must exist`);
  }
});

test("go-live carries a preflight checklist", () => {
  const g = prepareStep({ id: "golive" }, { domain: "app.aigovops.org" });
  assert.ok(g.preflight.some((p) => p.includes("/healthz")));
  assert.ok(g.preflight.some((p) => p.includes("/v1/conformance")));
});
