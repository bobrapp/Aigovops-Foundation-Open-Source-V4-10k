// A small, dependency-free 5-field cron parser (minute hour day-of-month month day-of-week).
// Supports *, lists (a,b), ranges (a-b), and steps (*/n, a-b/n). All matching is in UTC for
// determinism. Day-of-week is 0–6 with 0 = Sunday.

function parseField(field, min, max) {
  if (field === "*") return null; // null = "any"
  const out = new Set();
  for (const part of field.split(",")) {
    let [range, stepStr] = part.split("/");
    const step = stepStr ? Number(stepStr) : 1;
    let lo, hi;
    if (range === "*") { lo = min; hi = max; }
    else if (range.includes("-")) { [lo, hi] = range.split("-").map(Number); }
    else { lo = hi = Number(range); }
    if (!Number.isInteger(lo) || !Number.isInteger(hi) || !Number.isInteger(step) || step < 1) {
      throw new Error(`bad cron field "${field}"`);
    }
    for (let v = lo; v <= hi; v += step) out.add(v);
  }
  return out;
}

export function parseCron(expr) {
  const parts = String(expr).trim().split(/\s+/);
  if (parts.length !== 5) throw new Error(`cron must have 5 fields, got ${parts.length}`);
  const [min, hour, dom, mon, dow] = parts;
  return {
    minute: parseField(min, 0, 59),
    hour: parseField(hour, 0, 23),
    dom: parseField(dom, 1, 31),
    month: parseField(mon, 1, 12),
    dow: parseField(dow, 0, 6),
  };
}

const inSet = (set, val) => set === null || set.has(val);

/** Does `date` (UTC) satisfy the cron expression? */
export function matches(cron, date) {
  const c = typeof cron === "string" ? parseCron(cron) : cron;
  const domOk = inSet(c.dom, date.getUTCDate());
  const dowOk = inSet(c.dow, date.getUTCDay());
  // Classic cron rule: when BOTH day fields are restricted, match if EITHER matches.
  const dayOk = c.dom !== null && c.dow !== null ? domOk || dowOk : domOk && dowOk;
  return inSet(c.minute, date.getUTCMinutes()) && inSet(c.hour, date.getUTCHours()) && inSet(c.month, date.getUTCMonth() + 1) && dayOk;
}

/** The next UTC minute at or after `after` that the cron matches (within one year), or null. */
export function nextRun(cron, after) {
  const c = typeof cron === "string" ? parseCron(cron) : cron;
  const d = new Date(Math.floor(after.getTime() / 60000) * 60000 + 60000); // next minute boundary
  for (let i = 0; i < 366 * 24 * 60; i++) {
    if (matches(c, d)) return d;
    d.setTime(d.getTime() + 60000);
  }
  return null;
}
