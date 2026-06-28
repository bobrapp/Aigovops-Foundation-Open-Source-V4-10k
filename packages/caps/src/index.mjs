// Capability dial + hard caps — ported from the Library's battle-tested caps.js.
//
// Every member and agent has an explicit, reversible capability level and hard
// caps on spend, rate, and blast radius. The gate evaluates these AFTER human
// approval but BEFORE brokering a grant — the agent PAUSES at the cap rather
// than pushing through. Fail-closed: no profile → no capability.
//
// "Capability is a dial they earn, not a switch they flip."  read → propose → act → auto

export const LEVELS = { read: 0, propose: 1, act: 2, auto: 3 };
export const LEVEL_NAMES = Object.keys(LEVELS);

const levelOk = (current, required) => (LEVELS[current] ?? -1) >= (LEVELS[required] ?? Infinity);

export class Caps {
  constructor(opts = {}) {
    this.now = opts.now || (() => Date.now());
    this._profiles = new Map(); // id -> { level, maxSpend, maxRate, windowMs, maxBlastRadius }
    this._usage = new Map();    // id -> { spend, requests: [epoch], blastRadius }
  }

  setProfile(id, { level = "propose", maxSpend = Infinity, maxRate = Infinity, windowMs = 60_000, maxBlastRadius = Infinity } = {}) {
    if (!(level in LEVELS)) throw new Error(`unknown level '${level}'`);
    this._profiles.set(id, { level, maxSpend, maxRate, windowMs, maxBlastRadius });
    if (!this._usage.has(id)) this._usage.set(id, { spend: 0, requests: [], blastRadius: 0 });
  }

  getProfile(id) {
    return this._profiles.get(id) || null;
  }

  // Turn the dial — effective on the NEXT request. The one toggle that narrows capability at any time.
  setLevel(id, level) {
    if (!(level in LEVELS)) throw new Error(`unknown level '${level}'`);
    const p = this._profiles.get(id);
    if (!p) throw new Error(`no profile for '${id}'; call setProfile first`);
    p.level = level;
  }

  // Called by the gate BEFORE brokering. Returns { ok } or { ok:false, reason, ... }.
  check(id, { requiredLevel = "act", spend = 0, blastRadius = 0 } = {}) {
    const p = this._profiles.get(id);
    if (!p) return { ok: false, reason: "no-profile" }; // fail-closed
    const u = this._usage.get(id) || { spend: 0, requests: [], blastRadius: 0 };

    if (!levelOk(p.level, requiredLevel)) {
      return { ok: false, reason: "level", current: p.level, required: requiredLevel };
    }
    if (u.spend + spend > p.maxSpend) {
      return { ok: false, reason: "spend-cap", current: u.spend, max: p.maxSpend, requested: spend };
    }
    const windowStart = this.now() - p.windowMs;
    const recent = u.requests.filter((t) => t > windowStart);
    if (recent.length >= p.maxRate) {
      return { ok: false, reason: "rate-cap", current: recent.length, max: p.maxRate };
    }
    if (u.blastRadius + blastRadius > p.maxBlastRadius) {
      return { ok: false, reason: "blast-cap", current: u.blastRadius, max: p.maxBlastRadius, requested: blastRadius };
    }
    return { ok: true };
  }

  // Called by the gate AFTER a successful broker.
  record(id, { spend = 0, blastRadius = 0 } = {}) {
    const u = this._usage.get(id) || { spend: 0, requests: [], blastRadius: 0 };
    u.spend += spend;
    u.requests.push(this.now());
    u.blastRadius += blastRadius;
    this._usage.set(id, u);
  }

  resetUsage(id) {
    this._usage.set(id, { spend: 0, requests: [], blastRadius: 0 });
  }
}
