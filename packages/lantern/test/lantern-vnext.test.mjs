import { test } from "node:test";
import assert from "node:assert/strict";
import {
  psi, klFromSamples, ksStatistic, distributionDrift,
  evaluateSuite, Monitor, Alerter, alertmanagerChannel,
} from "../src/index.mjs";

const seq = (lo, hi) => Array.from({ length: hi - lo }, (_, i) => lo + i);

// --- statistical drift ------------------------------------------------------
test("identical distributions show no drift across PSI/KL/KS", () => {
  const a = seq(0, 100), b = seq(0, 100);
  assert.ok(psi(a, b) < 1e-6);
  assert.ok(klFromSamples(a, b) < 1e-6);
  assert.equal(ksStatistic(a, b), 0);
  assert.equal(distributionDrift({ baseline: a, current: b, method: "psi" }).status, "PASS");
});

test("a shifted distribution is flagged by PSI, KL and KS", () => {
  const baseline = seq(0, 100), shifted = seq(80, 180);
  assert.ok(psi(baseline, shifted) > 0.25);
  assert.ok(ksStatistic(baseline, shifted) > 0.1);
  assert.equal(distributionDrift({ baseline, current: shifted, method: "psi" }).status, "FAIL");
  assert.equal(distributionDrift({ baseline, current: shifted, method: "ks" }).status, "FAIL");
  assert.equal(distributionDrift({ baseline, current: shifted, method: "kl" }).status, "FAIL");
});

// --- data-quality (GE-style) ------------------------------------------------
test("expectation suite passes clean data and fails dirty data with mitigations", () => {
  const suite = {
    name: "users",
    expectations: [
      { type: "expect_column_values_to_not_be_null", column: "email" },
      { type: "expect_column_values_to_be_between", column: "age", min: 0, max: 120 },
      { type: "expect_table_row_count_to_be_between", min: 1, max: 1000 },
    ],
  };
  assert.equal(evaluateSuite(suite, [{ email: "a@x", age: 30 }, { email: "b@x", age: 41 }]).status, "PASS");
  const dirty = evaluateSuite(suite, [{ email: null, age: 200 }]);
  assert.equal(dirty.status, "FAIL");
  assert.ok(dirty.results.find((r) => !r.success).mitigation);
});

// --- monitor + alerting -----------------------------------------------------
test("Monitor runs mixed checks; Alerter routes FAILs in Alertmanager format", async () => {
  const monitor = new Monitor()
    .add({ name: "latency-dist", kind: "distribution", method: "psi", baseline: seq(0, 100), fetchCurrent: async () => seq(80, 180) })
    .add({ name: "cost", kind: "structural", baseline: { c: 100 }, current: { c: 101 }, tolerance: 0.05 });
  const results = await monitor.runAll();
  assert.equal(results.find((r) => r.name === "latency-dist").status, "FAIL");
  assert.equal(results.find((r) => r.name === "cost").status, "PASS");

  const captured = [];
  const alerter = new Alerter({ channels: [{ name: "fake", async send(a) { captured.push(a); } }] });
  const out = await alerter.route(results[0], { check: "latency-dist" });
  assert.equal(out.sent, 1);
  assert.equal(captured[0].labels.alertname, "AiGovOpsDrift");
  assert.equal(captured[0].labels.severity, "warning");
});

test("alertmanagerChannel POSTs to the v2 alerts API (injected transport)", async () => {
  const calls = [];
  const transport = async (req) => { calls.push(req); return { status: 200, json: {} }; };
  const ch = alertmanagerChannel({ baseUrl: "http://am:9093", transport });
  await ch.send({ labels: { alertname: "x" } });
  assert.match(calls[0].url, /\/api\/v2\/alerts$/);
  assert.deepEqual(calls[0].body[0].labels, { alertname: "x" });
});
