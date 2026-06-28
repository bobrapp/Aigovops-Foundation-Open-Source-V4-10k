// M18 — drift-history store. Lantern detected drift but kept no memory; this records each drift
// snapshot per monitored field so you can see the trend, find when a metric started moving, and
// summarize stability. Backed by the injectable @aigovops/store contract (Memory/File/Postgres).
// Closes the ROADMAP Lantern "baseline + drift-history store" gap.

export class DriftHistory {
  /** @param {{store?: {append, query}, now?: () => number}} opts — an array-store; defaults to in-memory. */
  constructor({ store, now } = {}) {
    this._mem = [];
    this.store = store || { append: (r) => this._mem.push(r), query: (f) => this._mem.filter(f || (() => true)) };
    this.now = now || (() => Date.now());
  }

  /** Record a snapshot for one field. `result` is a Lantern diff/distributionDrift output. */
  record(field, result, at = this.now()) {
    const snap = { field, at, drift: result?.drift ?? result?.score ?? null, withinTolerance: result?.withinTolerance ?? result?.ok ?? null, metric: result?.metric ?? null };
    this.store.append(snap);
    return snap;
  }

  /** All snapshots for a field, oldest→newest. */
  series(field) { return this.store.query((s) => s.field === field).sort((a, b) => a.at - b.at); }

  /** Latest snapshot for a field, or null. */
  latest(field) { const s = this.series(field); return s.length ? s[s.length - 1] : null; }

  /** Stability summary: count, breaches, and whether it's currently in tolerance. */
  summary(field) {
    const s = this.series(field);
    const breaches = s.filter((x) => x.withinTolerance === false).length;
    return { field, samples: s.length, breaches, stable: breaches === 0, current: s.length ? s[s.length - 1] : null };
  }
}
