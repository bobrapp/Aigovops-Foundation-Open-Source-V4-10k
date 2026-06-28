// M15 — the billing broker. One interface; the hosted service swaps the backend.
//
//   LocalBilling  — self-host: everything is free, no external calls, no lock-in.
//   StripeBilling — the hosted SaaS that funds the Foundation (Stripe is proprietary; the
//                   interface is ours, so Kill Bill / Lago / cloud marketplace can drop in).
//
// Billing only ever gates the *hosted service's* quotas — never the open-source code.
import { planFor } from "../../plans/src/index.mjs";

async function fetchTransport({ method = "GET", url, headers = {}, body } = {}) {
  const res = await fetch(url, { method, headers, body });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, json };
}

export class LocalBilling {
  name = "local";
  async checkout({ tenant }) { return { url: null, tenant, plan: "selfhost", note: "Self-hosted — no charge, ever." }; }
  async reportUsage() { return { ok: true }; }
  async status({ tenant }) { return { tenant, plan: "selfhost", active: true, price: 0 }; }
}

export class StripeBilling {
  name = "stripe";
  constructor({ apiKey, priceIds = {}, transport = fetchTransport, successUrl, cancelUrl } = {}) {
    Object.assign(this, { apiKey, priceIds, transport, successUrl, cancelUrl });
  }

  // x-www-form-urlencoded body, Stripe-style bracket keys.
  _form(obj) {
    return Object.entries(obj).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
  }

  async checkout({ tenant, plan = "team" }) {
    const price = this.priceIds[plan];
    if (!price) throw new Error(`no Stripe price configured for plan '${plan}'`);
    const { status, json } = await this.transport({
      method: "POST",
      url: "https://api.stripe.com/v1/checkout/sessions",
      headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/x-www-form-urlencoded" },
      body: this._form({
        mode: "subscription", "line_items[0][price]": price, "line_items[0][quantity]": 1,
        client_reference_id: tenant, success_url: this.successUrl || "https://aigovops.org/welcome",
        cancel_url: this.cancelUrl || "https://aigovops.org/pricing",
      }),
    });
    if (status >= 300 || !json) throw new Error(`Stripe checkout ${status}`);
    return { url: json.url, id: json.id, tenant, plan };
  }

  async reportUsage({ subscriptionItem, quantity, transport }) {
    const t = transport || this.transport;
    const { status } = await t({
      method: "POST",
      url: `https://api.stripe.com/v1/subscription_items/${subscriptionItem}/usage_records`,
      headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/x-www-form-urlencoded" },
      body: this._form({ quantity, action: "increment" }),
    });
    if (status >= 300) throw new Error(`Stripe usage ${status}`);
    return { ok: true };
  }

  async status({ tenant, plan = "team" }) { return { tenant, plan, active: true, price: planFor(plan).price }; }
}
