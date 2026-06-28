// M14 — governance metrics in Prometheus text format, so Prometheus/Grafana/Superset can chart
// the gate's behavior (decisions, pass rate, drift) for the analytics consoles. In-memory counters
// incremented by the API; GET /v1/metrics renders them.
const counters = {
  aigovops_decisions_total: 0,
  aigovops_decisions_pass: 0,
  aigovops_decisions_fail: 0,
  aigovops_improve_total: 0,
  aigovops_compare_total: 0,
};

export function inc(name, n = 1) {
  if (name in counters) counters[name] += n;
}

export function snapshot() {
  return { ...counters };
}

/** Render Prometheus exposition text. `gauges` adds point-in-time values (e.g. conformance). */
export function renderMetrics(gauges = {}) {
  const lines = ["# AiGovOps governance metrics"];
  for (const [k, v] of Object.entries(counters)) {
    lines.push(`# TYPE ${k} counter`, `${k} ${v}`);
  }
  for (const [k, v] of Object.entries(gauges)) {
    lines.push(`# TYPE ${k} gauge`, `${k} ${v}`);
  }
  return lines.join("\n") + "\n";
}
