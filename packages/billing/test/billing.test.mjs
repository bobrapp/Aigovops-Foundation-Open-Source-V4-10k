import { test } from "node:test";
import assert from "node:assert/strict";
import { LocalBilling, StripeBilling } from "../src/index.mjs";

test("LocalBilling is free and makes no external calls (self-host)", async () => {
  const b = new LocalBilling();
  const co = await b.checkout({ tenant: "local" });
  assert.equal(co.url, null);
  assert.equal(co.plan, "selfhost");
  assert.deepEqual(await b.reportUsage(), { ok: true });
});

test("StripeBilling creates a checkout session (injected transport, no network)", async () => {
  const calls = [];
  const transport = async (req) => { calls.push(req); return { status: 200, json: { id: "cs_123", url: "https://checkout.stripe/cs_123" } }; };
  const b = new StripeBilling({ apiKey: "sk_test", priceIds: { team: "price_team" }, transport, successUrl: "https://x/ok" });
  const co = await b.checkout({ tenant: "acme", plan: "team" });
  assert.equal(co.url, "https://checkout.stripe/cs_123");
  assert.match(calls[0].url, /checkout\/sessions$/);
  assert.match(calls[0].body, /line_items%5B0%5D%5Bprice%5D=price_team/);   // the team price, form-encoded
  assert.match(calls[0].body, /client_reference_id=acme/);
  assert.equal(calls[0].headers.authorization, "Bearer sk_test");
});

test("StripeBilling rejects an unconfigured plan and reports usage", async () => {
  const transport = async () => ({ status: 200, json: {} });
  const b = new StripeBilling({ apiKey: "k", priceIds: {}, transport });
  await assert.rejects(() => b.checkout({ tenant: "x", plan: "team" }), /no Stripe price/);
  assert.deepEqual(await b.reportUsage({ subscriptionItem: "si_1", quantity: 10 }), { ok: true });
});
