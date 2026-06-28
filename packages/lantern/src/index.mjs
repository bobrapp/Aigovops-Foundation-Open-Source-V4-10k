import { gate } from "../../../shared/gate.mjs";
import { diff, withinTolerance, describe, escalation } from "./diff.mjs";

export { diff, withinTolerance, describe, escalation } from "./diff.mjs";

// Lantern — Monitoring & drift. Compares a baseline to a current snapshot,
// ignores numeric moves within tolerance, and gates on anything that drifted.
export function detectDrift(input = {}) {
  const { baseline, current, tolerance = 0 } = input;

  const pre = gate("lantern", [
    { id: "lantern:baseline-present", pass: baseline !== undefined, fix: "Capture a baseline snapshot before measuring drift." },
    { id: "lantern:current-present", pass: current !== undefined, fix: "Provide the current snapshot to compare against the baseline." },
  ]);
  if (pre.status !== "PASS") return pre;

  const drift = diff(baseline, current).filter((c) => !withinTolerance(c, tolerance));

  const result = gate(
    "lantern",
    drift.map((c) => ({ id: `lantern:drift:${c.path}`, pass: false, fix: describe(c) })),
  );
  return { ...result, drift, escalate: escalation(drift) };
}

// Demo when run directly: a numeric drift beyond tolerance.
if (import.meta.url === `file://${process.argv[1]}`) {
  const out = detectDrift({
    baseline: { latencyMs: 100, model: "claude-opus-4-8" },
    current: { latencyMs: 180, model: "claude-opus-4-8" },
    tolerance: 0.1,
  });
  console.log(JSON.stringify(out, null, 2));
}
