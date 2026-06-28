import { test } from "node:test";
import assert from "node:assert/strict";
import { watch, snapshot, watchFeed, attest, bundle, TIER1_JOBS } from "../src/index.mjs";
import { verifyReceipt } from "../../beacon/src/index.mjs";

test("regulation-watch: baseline run, then detects an added + a changed requirement", () => {
  const base = watch({});
  assert.equal(base.baseline, true);
  assert.ok(base.total > 0);

  const prev = snapshot();
  // simulate the prior snapshot missing one id and having a stale citation on another
  const tampered = prev.filter((r) => r.id !== prev[0].id).map((r) => (r.id === prev[1].id ? { ...r, citation: "OLD" } : r));
  const w = watch({ previous: tampered });
  assert.equal(w.baseline, false);
  assert.ok(w.added.includes(prev[0].id));
  assert.ok(w.changed.some((c) => c.id === prev[1].id && c.to === prev[1].citation));
});

test("regulation-watch: pulls from a live feed (injected transport) and diffs", async () => {
  const previous = snapshot();
  // The feed adds a brand-new requirement and drops an existing one.
  const feed = async () => [
    ...previous.filter((r) => r.id !== previous[0].id),
    { id: "new-reg/2027", citation: "Some New Act 2027, §1" },
  ];
  const w = await watchFeed({ previous, url: "https://feed.example/registry.json", transport: feed });
  assert.ok(w.added.includes("new-reg/2027"));
  assert.ok(w.removed.includes(previous[0].id));
});

test("compliance-attestor: runs the batch and signs a verifiable bundle", () => {
  const out = attest({
    checks: [
      { name: "ok", profile: "baseline", payload: { model: "claude-opus-4-8", humanApproved: true } },
      { name: "bad", profile: "baseline", payload: { model: "gpt-4", humanApproved: false } },
    ],
    at: "2026-06-28T00:00:00Z",
  });
  assert.deepEqual(out.summary, { total: 2, pass: 1, fail: 1 });
  assert.equal(verifyReceipt(out.bundleReceipt, out.publicKey), true);
});

test("audit-bundler: tallies the ledger by verdict and citation, signed", () => {
  const records = [
    { status: "PASS", citations: ["EU AI Act Art. 14"] },
    { status: "FAIL", citations: ["EU AI Act Art. 14", "GDPR Art. 35"] },
  ];
  const out = bundle({ records, at: "2026-06-28T00:00:00Z" });
  assert.equal(out.report.total, 2);
  assert.deepEqual(out.report.byStatus, { PASS: 1, FAIL: 1 });
  assert.equal(out.report.byCitation["EU AI Act Art. 14"], 2);
  assert.equal(verifyReceipt(out.receipt, out.publicKey), true);
});

test("TIER1_JOBS defines three scheduled agents with cron + describe", () => {
  assert.equal(TIER1_JOBS.length, 3);
  for (const j of TIER1_JOBS) assert.ok(j.name && /\S+ \S+ \S+ \S+ \S+/.test(j.cron) && j.describe);
});
