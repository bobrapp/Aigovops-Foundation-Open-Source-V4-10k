import { test } from "node:test";
import assert from "node:assert/strict";
import { handle } from "../src/index.mjs";
import { _reset, verifyReceipt } from "../src/evidence.mjs";

const GOOD = (actor) => ({ profile: "baseline", payload: { model: "claude-opus-4-8", humanApproved: true }, requestedBy: actor });

test("signed decisions are appended to a verifiable, role-scoped evidence chain", async () => {
  _reset("local");
  await handle({ method: "POST", path: "/v1/decide", body: GOOD("alice") });
  await handle({ method: "POST", path: "/v1/decide", body: GOOD("bob") });

  const all = (await handle({ method: "GET", path: "/v1/evidence" })).json; // steward by default
  assert.equal(all.count, 2);
  assert.equal(all.chain.ok, true);          // hash chain intact
  assert.equal(all.entries[1].prev, all.entries[0].hash);

  const mine = (await handle({ method: "GET", path: "/v1/evidence", headers: { "x-aigovops-role": "member", "x-aigovops-actor": "alice" } })).json;
  assert.equal(mine.count, 1);               // a member sees only their own
  assert.equal(mine.entries[0].receipt.actor, "alice");
});

test("the verify endpoint confirms the chain", async () => {
  _reset("local");
  await handle({ method: "POST", path: "/v1/decide", body: GOOD("x") });
  assert.equal((await handle({ method: "GET", path: "/v1/evidence/verify" })).json.ok, true);
});

test("the evidence bundle (DSAR) is subject-scoped and signed", async () => {
  _reset("local");
  await handle({ method: "POST", path: "/v1/decide", body: GOOD("alice") });
  await handle({ method: "POST", path: "/v1/decide", body: GOOD("alice") });
  await handle({ method: "POST", path: "/v1/decide", body: GOOD("bob") });

  const bundle = (await handle({ method: "POST", path: "/v1/evidence/bundle", body: { subject: "alice" } })).json;
  assert.equal(bundle.schema, "aigovops.dsar/1");
  assert.equal(bundle.count, 2);             // alice's two decisions only
  assert.equal(verifyReceipt(bundle.bundleReceipt, bundle.publicKey), true);
});
