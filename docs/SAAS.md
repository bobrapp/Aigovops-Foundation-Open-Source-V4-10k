# AiGovOps — hosted SaaS, open-core (M15)

**The deal, plainly:** the entire platform is MIT-licensed, zero-dependency, and **self-hostable forever
for free** — on-prem, in a VPC/enclave, on a single VPS, in a lab, or on a device. The hosted SaaS exists
only to **fund the AiGovOps Foundation** and to offer a zero-ops way to try and run it. The hosted service
runs the *identical* open-source code. **No lock-in, ever** — a hosted tenant can export everything and
`curl … | sh` the same stack on their own infrastructure in minutes.

## How it's wired (open-core, off by default)

The SaaS layer is three small packages plus a thin server surface. **None of it changes the open-source
behavior** — off-cloud, every request is a single unlimited `local` tenant and billing is `LocalBilling`
(free, no external calls). It only activates when you set `AIGOVOPS_HOSTED=1`.

| Package | Role |
|---|---|
| `@aigovops/plans` | the catalog (Free · Team · Enterprise · **Self-hosted = unlimited & free**) + entitlement checks |
| `@aigovops/tenancy` | multi-tenant registry, request → tenant resolution (header/subdomain), per-tenant usage metering |
| `@aigovops/billing` | `BillingProvider`: `LocalBilling` (self-host) + `StripeBilling` (hosted) — swappable for Kill Bill / Lago |

Server endpoints (hosted): `GET /pricing`, `GET /v1/account` (plan + usage + limits), `POST /v1/billing/checkout`,
and quota metering on `/v1/decide` (a `402 → /pricing` only when a hosted tenant exceeds its plan).

## Run it hosted (to demo / fund the Foundation)

```bash
AIGOVOPS_HOSTED=1 \
AIGOVOPS_STRIPE_KEY=sk_live_… \
AIGOVOPS_STRIPE_PRICE_TEAM=price_… \
node packages/server/src/cli.mjs        # behind Caddy/APISIX for TLS + subdomain-per-tenant
```
Deploy it like any other tier (Compose/Helm/`aigovops deploy`), front it with Caddy for automatic HTTPS,
and route `tenant.aigovops.org` → the gate. Usage meters feed Stripe; the pricing page is at `/pricing`.

## Run it yourself (the default, forever free)

```bash
curl -fsSL https://get.aigovops.org | sh   # or: aigovops up · docker run · helm install · the Tauri app
```
No `AIGOVOPS_HOSTED`, no billing, no tenancy, no quotas — the full product, unlimited.

## Honest notes

- **Billing backend.** Stripe is proprietary — the pragmatic way to actually collect revenue. The interface
  is ours, so an Apache-2.0 option (Kill Bill) or OSS usage-billing (Lago) drops in behind `BillingProvider`.
- **The promise is load-bearing.** Hosted quotas gate only the *hosted service*. The MIT code never checks a
  license, never phones home, and runs unlimited on your own infra. That's the Foundation's commitment.

*Agents do the bureaucracy; humans hold the meaning — and humans hold the keys.*
