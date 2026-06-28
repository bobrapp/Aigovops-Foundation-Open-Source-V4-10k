// Umbrella v-next (M8) — policy lifecycle: versioning, simulation, canary rollout.
//
// Policies are append-only versioned. Before promoting a new version you can SIMULATE it over a
// set of payloads, and CANARY it against the current version to see exactly where the two diverge
// — the safe way to change a gate without surprising production.
import { compile } from "./compile.mjs";

export class PolicyRegistry {
  constructor() { this.versions = []; }

  /** Publish a new immutable version (compiled to guarantee it runs). */
  publish(policy, { at } = {}) {
    compile(policy);
    const entry = { version: this.versions.length + 1, policy, at: at ?? null };
    this.versions.push(entry);
    return entry;
  }

  get current() { return this.versions[this.versions.length - 1] || null; }
  get(version) { return this.versions.find((v) => v.version === version) || null; }

  /** Re-publish an earlier version as the new current (rollback forward). */
  rollback(version) {
    const e = this.get(version);
    if (!e) throw new Error(`no version ${version}`);
    return this.publish(e.policy);
  }

  /** Evaluate a version against a set of payloads. */
  simulate(version, payloads) {
    const c = compile(this.get(version).policy);
    return payloads.map((p) => ({ payload: p, ...c.evaluate(p) }));
  }

  /** Compare a candidate policy against the current version over payloads. */
  canary(candidatePolicy, payloads) {
    const cur = compile(this.current.policy);
    const cand = compile(candidatePolicy);
    const rows = payloads.map((p) => {
      const current = cur.evaluate(p).status;
      const candidate = cand.evaluate(p).status;
      return { payload: p, current, candidate, agree: current === candidate };
    });
    const agree = rows.filter((r) => r.agree).length;
    return { total: rows.length, agree, agreementRate: rows.length ? agree / rows.length : 1, divergence: rows.filter((r) => !r.agree) };
  }
}
