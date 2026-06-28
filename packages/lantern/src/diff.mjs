// Lantern drift engine — structural + numeric semantic diff. Zero dependencies.

const isObject = (x) => x !== null && typeof x === "object";
const j = (v) => (v === undefined ? "∅" : JSON.stringify(v));

/**
 * Deep diff between a baseline and a current snapshot.
 * @returns {Array<{path:string, kind:"added"|"removed"|"changed", from:*, to:*}>}
 */
export function diff(baseline, current, path = "") {
  // Leaf comparison (either side is a primitive, or types differ).
  if (!isObject(baseline) || !isObject(current)) {
    if (!Object.is(baseline, current)) {
      return [{ path: path || "(root)", kind: "changed", from: baseline, to: current }];
    }
    return [];
  }
  const changes = [];
  const keys = new Set([...Object.keys(baseline), ...Object.keys(current)]);
  for (const k of keys) {
    const p = path ? `${path}.${k}` : k;
    if (!(k in baseline)) changes.push({ path: p, kind: "added", from: undefined, to: current[k] });
    else if (!(k in current)) changes.push({ path: p, kind: "removed", from: baseline[k], to: undefined });
    else changes.push(...diff(baseline[k], current[k], p));
  }
  return changes;
}

/** A numeric change is "within tolerance" (not drift) if its relative move ≤ tolerance. */
export function withinTolerance(change, tolerance = 0) {
  if (change.kind !== "changed") return false; // added/removed always count as drift
  if (typeof change.from === "number" && typeof change.to === "number") {
    const denom = Math.max(Math.abs(change.from), 1e-9);
    return Math.abs(change.to - change.from) / denom <= tolerance;
  }
  return false;
}

/** Human-readable mitigation for a drift change. */
export function describe(change) {
  if (change.kind === "added") return `Unexpected new field "${change.path}" = ${j(change.to)} — review, then re-baseline if intended.`;
  if (change.kind === "removed") return `Field "${change.path}" disappeared (was ${j(change.from)}) — restore it or re-baseline.`;
  return `"${change.path}" drifted ${j(change.from)} → ${j(change.to)} — investigate or widen tolerance.`;
}

/** Escalation level for a set of drift changes. */
export function escalation(drift) {
  if (drift.length === 0) return "none";
  const structural = drift.some((c) => c.kind === "added" || c.kind === "removed");
  return structural || drift.length > 3 ? "escalate" : "notify";
}
