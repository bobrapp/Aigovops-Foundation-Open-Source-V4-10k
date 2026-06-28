import { test } from "node:test";
import assert from "node:assert/strict";
import { Caps } from "../src/index.mjs";

test("no profile → fail-closed", () => {
  const caps = new Caps();
  assert.deepEqual(caps.check("agent-x"), { ok: false, reason: "no-profile" });
});

test("capability level is enforced", () => {
  const caps = new Caps();
  caps.setProfile("a", { level: "propose" });
  assert.equal(caps.check("a", { requiredLevel: "act" }).ok, false);
  caps.setLevel("a", "act");
  assert.equal(caps.check("a", { requiredLevel: "act" }).ok, true);
});

test("spend cap blocks at the limit", () => {
  const caps = new Caps();
  caps.setProfile("a", { level: "act", maxSpend: 100 });
  assert.equal(caps.check("a", { spend: 50 }).ok, true);
  caps.record("a", { spend: 80 });
  const r = caps.check("a", { spend: 50 });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "spend-cap");
});

test("rate cap uses a sliding window", () => {
  let t = 1000;
  const caps = new Caps({ now: () => t });
  caps.setProfile("a", { level: "act", maxRate: 2, windowMs: 1000 });
  caps.record("a", {}); caps.record("a", {});
  assert.equal(caps.check("a", {}).reason, "rate-cap");
  t += 1001; // window slides past the two requests
  assert.equal(caps.check("a", {}).ok, true);
});

test("blast radius cap is enforced", () => {
  const caps = new Caps();
  caps.setProfile("a", { level: "act", maxBlastRadius: 10 });
  caps.record("a", { blastRadius: 8 });
  assert.equal(caps.check("a", { blastRadius: 5 }).reason, "blast-cap");
});
