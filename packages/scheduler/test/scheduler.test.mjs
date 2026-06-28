import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCron, matches, nextRun, Scheduler, toAirflowDags, toGithubActionsWorkflow } from "../src/index.mjs";
import { TIER1_JOBS } from "../../agents/src/index.mjs";

const utc = (...a) => new Date(Date.UTC(...a));

test("cron parses fields and rejects malformed expressions", () => {
  assert.equal(parseCron("0 6 * * 1").hour.has(6), true);
  assert.equal(parseCron("*/15 * * * *").minute.has(45), true);
  assert.throws(() => parseCron("0 6 * *"), /5 fields/);
});

test("matches: Monday 06:00 cron fires only at that minute", () => {
  const cron = "0 6 * * 1";
  assert.equal(matches(cron, utc(2026, 0, 5, 6, 0)), true);   // 2026-01-05 is a Monday
  assert.equal(matches(cron, utc(2026, 0, 5, 6, 1)), false);
  assert.equal(matches(cron, utc(2026, 0, 6, 6, 0)), false);  // Tuesday
});

test("step minutes match on the step boundary", () => {
  assert.equal(matches("*/15 * * * *", utc(2026, 0, 1, 9, 30)), true);
  assert.equal(matches("*/15 * * * *", utc(2026, 0, 1, 9, 31)), false);
});

test("nextRun finds the next firing", () => {
  const next = nextRun("0 6 * * 1", utc(2026, 0, 1, 0, 0)); // first Monday 06:00 after Jan 1
  assert.equal(next.toISOString(), "2026-01-05T06:00:00.000Z");
});

test("Scheduler runs only due jobs", async () => {
  let ran = 0;
  const s = new Scheduler()
    .register({ name: "daily", cron: "0 6 * * *", run: async () => (++ran, "daily") })
    .register({ name: "weekly", cron: "0 6 * * 1", run: async () => (++ran, "weekly") });
  const out = await s.runDue(utc(2026, 0, 6, 6, 0)); // Tuesday 06:00 → only daily
  assert.deepEqual(out.map((r) => r.name), ["daily"]);
  assert.equal(ran, 1);
});

test("Airflow exporter emits a valid-looking DAG per Tier-1 job", () => {
  const py = toAirflowDags(TIER1_JOBS);
  assert.match(py, /from airflow import DAG/);
  assert.match(py, /dag_id='aigovops_regulation_watch'/);
  assert.match(py, /schedule_interval='0 6 \* \* 1'/);
  assert.match(py, /BashOperator/);
  assert.match(py, /node packages\/agents\/src\/run\.mjs regulation-watch/);
  assert.equal((py.match(/with DAG\(/g) || []).length, 3); // one DAG per agent
});

test("GitHub Actions exporter emits scheduled jobs", () => {
  const yml = toGithubActionsWorkflow(TIER1_JOBS);
  assert.match(yml, /name: tier1-agents/);
  assert.match(yml, /- cron: '0 6 \* \* \*'/);
  assert.match(yml, /node packages\/agents\/src\/run\.mjs audit-bundler/);
});
