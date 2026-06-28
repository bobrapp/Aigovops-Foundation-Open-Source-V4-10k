import { test } from "node:test";
import assert from "node:assert/strict";
import { DriftHistory } from "../src/index.mjs";

test("records a per-field series oldest→newest and reports the latest", () => {
  const h = new DriftHistory();
  h.record("toxicity", { metric: "psi", drift: 0.02, withinTolerance: true }, 100);
  h.record("toxicity", { metric: "psi", drift: 0.31, withinTolerance: false }, 300);
  h.record("toxicity", { metric: "psi", drift: 0.05, withinTolerance: true }, 200);

  const series = h.series("toxicity");
  assert.deepEqual(series.map((s) => s.at), [100, 200, 300]); // sorted by time
  assert.equal(h.latest("toxicity").drift, 0.31);             // newest = t=300
});

test("summary counts breaches and reports stability", () => {
  const h = new DriftHistory();
  h.record("latency", { drift: 0.01, withinTolerance: true });
  h.record("latency", { drift: 0.4, withinTolerance: false });
  const s = h.summary("latency");
  assert.equal(s.samples, 2);
  assert.equal(s.breaches, 1);
  assert.equal(s.stable, false);
});

test("uses an injected store when provided", () => {
  const rows = [];
  const h = new DriftHistory({ store: { append: (r) => rows.push(r), query: (f) => rows.filter(f) } });
  h.record("acc", { drift: 0.0, withinTolerance: true });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].field, "acc");
});
