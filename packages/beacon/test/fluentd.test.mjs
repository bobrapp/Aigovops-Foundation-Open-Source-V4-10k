import { test } from "node:test";
import assert from "node:assert/strict";
import { Ledger, signEvidence, toFluentdRecord, FluentdSink } from "../src/index.mjs";

async function entryWithReceipt() {
  const l = new Ledger();
  const ev = signEvidence({ configured: true, payload: { secret: "should-never-ship", subject: "alice@example.com" } });
  return l.append({ actor: "gate", action: "decide", receipt: ev.receipt });
}

test("toFluentdRecord ships metadata only — no payload, no PII", async () => {
  const rec = toFluentdRecord(await entryWithReceipt());
  assert.equal(rec.tag, "aigovops.ledger");
  assert.ok(rec.record.hash && rec.record.evidenceHash);
  const blob = JSON.stringify(rec.record);
  assert.doesNotMatch(blob, /should-never-ship|alice@example.com|payload|subject/);
});

test("FluentdSink POSTs the record to the tagged endpoint (injected transport)", async () => {
  const calls = [];
  const sink = new FluentdSink({ endpoint: "http://fluentd:9880", transport: async (req) => { calls.push(req); return { status: 200 }; } });
  assert.equal(sink.usable(), true);
  const r = await sink.ship(await entryWithReceipt());
  assert.equal(r.ok, true);
  assert.match(calls[0].url, /\/aigovops\.ledger$/);
  assert.ok(Number.isInteger(calls[0].body.seq));
});

test("a sink with no endpoint is a safe no-op", async () => {
  const sink = new FluentdSink({ endpoint: undefined });
  assert.equal((await sink.ship(await entryWithReceipt())).ok, false);
});
