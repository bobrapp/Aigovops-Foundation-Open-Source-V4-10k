// M17 — self-observability. A zero-dependency tracer: one span per request, a ring of recent
// spans (GET /v1/traces), and an OTLP/HTTP exporter so the gate's own traces flow to the
// OpenTelemetry Collector or Jaeger — without adding the OTel SDK (which would break the
// zero-dependency core). Metrics already ship at /v1/metrics (M14); this adds traces.
const RING = 200;
const spans = [];
let seq = 0;

export function startSpan(name, attributes = {}) {
  const start = process.hrtime.bigint();
  return {
    name,
    attributes,
    end(status = "OK") {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      spans.push({ id: ++seq, name, attributes: { ...attributes }, status, durationMs: Math.round(durationMs * 1000) / 1000 });
      if (spans.length > RING) spans.shift();
    },
  };
}

export function recentSpans(n = 50) { return spans.slice(-n); }

let drained = 0;
/** Return spans not yet exported, and mark them exported. Resets if the ring wrapped. */
export function drainSpans() {
  if (drained > spans.length) drained = 0;
  const out = spans.slice(drained);
  drained = spans.length;
  return out;
}

export function _reset() { spans.length = 0; drained = 0; }

/** OTLP/HTTP JSON for the OpenTelemetry Collector (/v1/traces) — also consumable by Jaeger's OTLP receiver. */
export function toOtlp(list = spans) {
  return {
    resourceSpans: [{
      resource: { attributes: [{ key: "service.name", value: { stringValue: "aigovops-gate" } }] },
      scopeSpans: [{
        scope: { name: "aigovops" },
        spans: list.map((s) => ({
          name: s.name, kind: 2 /* SERVER */,
          attributes: Object.entries(s.attributes || {}).map(([k, v]) => ({ key: k, value: { stringValue: String(v) } })),
          status: { code: s.status === "ERROR" ? 2 : 1 },
        })),
      }],
    }],
  };
}

async function fetchTransport({ method = "POST", url, headers = {}, body } = {}) {
  const res = await fetch(url, { method, headers, body: typeof body === "string" ? body : JSON.stringify(body) });
  return { status: res.status };
}

/** Push recent spans to an OTLP/HTTP endpoint (the OTel Collector). Injectable transport for tests. */
export async function exportOtlp({ endpoint, transport = fetchTransport, list } = {}) {
  const payload = toOtlp(list || spans);
  const { status } = await transport({ method: "POST", url: `${endpoint}/v1/traces`, headers: { "content-type": "application/json" }, body: payload });
  if (status >= 300) throw new Error(`OTLP export ${status}`);
  return { ok: true, exported: payload.resourceSpans[0].scopeSpans[0].spans.length };
}
