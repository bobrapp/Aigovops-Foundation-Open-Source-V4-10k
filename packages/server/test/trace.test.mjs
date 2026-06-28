import { test } from "node:test";
import assert from "node:assert/strict";
import { startSpan, recentSpans, toOtlp, exportOtlp, drainSpans, _reset } from "../src/trace.mjs";

test("a span is recorded with a duration and status", () => {
  _reset();
  const s = startSpan("GET /healthz", { method: "GET" });
  s.end("OK");
  const spans = recentSpans();
  assert.equal(spans.length, 1);
  assert.equal(spans[0].name, "GET /healthz");
  assert.equal(spans[0].status, "OK");
  assert.ok(spans[0].durationMs >= 0);
});

test("toOtlp produces OTLP/HTTP JSON the Collector/Jaeger accept", () => {
  _reset();
  startSpan("POST /v1/decide", { path: "/v1/decide" }).end("OK");
  const otlp = toOtlp();
  assert.equal(otlp.resourceSpans[0].resource.attributes[0].value.stringValue, "aigovops-gate");
  const span = otlp.resourceSpans[0].scopeSpans[0].spans[0];
  assert.equal(span.name, "POST /v1/decide");
  assert.equal(span.status.code, 1); // OK
  assert.equal(span.attributes[0].key, "path");
});

test("drainSpans returns only un-exported spans, so the collector sees no duplicates", () => {
  _reset();
  startSpan("a").end();
  startSpan("b").end();
  assert.equal(drainSpans().length, 2); // first flush sees both
  assert.equal(drainSpans().length, 0); // nothing new
  startSpan("c").end();
  const next = drainSpans();
  assert.equal(next.length, 1);
  assert.equal(next[0].name, "c");
});

test("exportOtlp POSTs to the collector's /v1/traces (injected transport)", async () => {
  _reset();
  startSpan("x").end("ERROR");
  const calls = [];
  const transport = async (req) => { calls.push(req); return { status: 200 }; };
  const r = await exportOtlp({ endpoint: "http://otel-collector:4318", transport });
  assert.equal(r.ok, true);
  assert.equal(r.exported, 1);
  assert.match(calls[0].url, /\/v1\/traces$/);
  assert.equal(calls[0].body.resourceSpans[0].scopeSpans[0].spans[0].status.code, 2); // ERROR
});
