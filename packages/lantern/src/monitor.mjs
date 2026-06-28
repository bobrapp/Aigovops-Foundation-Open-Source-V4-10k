// Lantern v-next (M7) — continuous monitoring + alert routing.
//
// A Monitor runs a set of checks (structural drift, distributional drift, or a data-quality
// suite) against their baselines on a cadence — pair it with @aigovops/scheduler to run hands-off.
// An Alerter routes any FAIL to one or more channels in Alertmanager's wire format.
import { detectDrift } from "./index.mjs";
import { distributionDrift } from "./stats.mjs";
import { evaluateSuite } from "./expectations.mjs";

export class Monitor {
  /** @param {{checks?: Array}} [opts]  each check: {name, kind, baseline?, current?, fetchCurrent?, ...} */
  constructor({ checks = [] } = {}) { this.checks = checks; }

  add(check) { this.checks.push(check); return this; }

  /** Run every check; returns [{name, kind, ...verdict}]. */
  async runAll() {
    const out = [];
    for (const c of this.checks) {
      const current = c.fetchCurrent ? await c.fetchCurrent() : c.current;
      let r;
      if (c.kind === "distribution") r = distributionDrift({ baseline: c.baseline, current, method: c.method, threshold: c.threshold, bins: c.bins });
      else if (c.kind === "quality") r = evaluateSuite(c.suite, current);
      else r = detectDrift({ baseline: c.baseline, current, tolerance: c.tolerance });
      out.push({ name: c.name, kind: c.kind || "structural", ...r });
    }
    return out;
  }
}

export class Alerter {
  /** @param {{channels?: Array<{name, send(alert):Promise}>}} [opts] */
  constructor({ channels = [] } = {}) { this.channels = channels; }

  /** Route a FAILing verdict to every channel as an Alertmanager alert. Returns {sent, alert?}. */
  async route(verdict, { check = "check", labels = {}, at } = {}) {
    if (verdict.status !== "FAIL") return { sent: 0 };
    const alert = {
      labels: { alertname: "AiGovOpsDrift", check, severity: verdict.escalate === "escalate" ? "critical" : "warning", ...labels },
      annotations: {
        summary: `Drift on ${check}`,
        method: verdict.method || verdict.kind || "structural",
        score: verdict.score != null ? String(verdict.score) : undefined,
      },
      startsAt: at ?? undefined,
    };
    let sent = 0;
    for (const ch of this.channels) { await ch.send(alert); sent++; }
    return { sent, alert };
  }
}

/** An Alertmanager channel: POSTs alerts to the v2 API via an injectable transport. */
export function alertmanagerChannel({ baseUrl, transport }) {
  return {
    name: "alertmanager",
    async send(alert) {
      const { status } = await transport({ method: "POST", url: `${baseUrl}/api/v2/alerts`, body: [alert] });
      if (status >= 300) throw new Error(`alertmanager ${status}`);
    },
  };
}
