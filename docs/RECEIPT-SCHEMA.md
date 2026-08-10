# The AiGovOps receipt — the one-format contract

*Frozen 2026-08-09 (Phase 2, anoint revive). Machine schema: [`schema/receipt.schema.json`](../schema/receipt.schema.json).
Source of truth: [`packages/beacon/src/sign.mjs`](../packages/beacon/src/sign.mjs).*

A **receipt** is a small, signed JSON proof that a specific piece of evidence existed and passed
(or was denied by) its gate at a moment in time. Anyone holding the ed25519 public key can verify
it **offline** — no network, no trust in our code. The receipt is the unit the whole estate is
meant to emit and read; freezing its shape is what makes "one gate, one receipt, verified anywhere"
real instead of aspirational.

## The receipt (the signed unit)

Exactly six fields — no more, no fewer (`additionalProperties: false`):

| Field | Type | Meaning |
|---|---|---|
| `schema` | const `"aigovops.beacon.receipt/1"` | Format id; bump the version only on a breaking change. |
| `algorithm` | const `"ed25519"` | Signature algorithm (RFC 8032). |
| `gate` | string | The gate that issued it (e.g. `"beacon"`). |
| `issuedAt` | ISO-8601 datetime | When it was signed. |
| `evidenceHash` | 64-char lowercase hex | SHA-256 over the **canonical form of the evidence** — never the payload itself. |
| `signature` | base64 | ed25519 signature over the canonical body (all fields **except** `signature`). |

Metadata only. The evidence payload is hashed, never carried — the same rule the estate ledger
enforces everywhere.

```json
{
  "schema": "aigovops.beacon.receipt/1",
  "algorithm": "ed25519",
  "gate": "beacon",
  "issuedAt": "2026-08-10T01:49:38.747Z",
  "evidenceHash": "a6adde4b7740f722fa984f8437f124ba95bff4406ef1c9a9818f4f232817f6aa",
  "signature": "<base64 ed25519>"
}
```

## Canonicalization (the part that must be pinned)

Both signing and verifying serialize the body with a **deterministic, key-sorted** form
(`canonicalize()` in `sign.mjs`): object keys sorted, arrays in order, scalars via `JSON.stringify`.
Sign and verify over the **same bytes**, so key order in transit is irrelevant.

> **⚠️ Cross-system reconciliation item (open).** This monorepo's `canonicalize()` is
> **sorted-key `JSON.stringify`**, *not* full **RFC 8785 (JCS)**. The Library governed core's Beacon
> uses RFC 8785. The two agree on simple objects but can diverge on number formatting and
> non-ASCII escaping — which means a receipt signed by one may fail verification by the other.
> **For "one receipt, verified anywhere," the canonicalization algorithm must be pinned to a single
> spec across every system.** Recommendation: adopt RFC 8785 as the one canonicalizer (it's the
> stricter, published standard) and re-point this `canonicalize()` at it. Tracked as a T0-DECIDE
> follow-up, not resolved on this branch.

## The ledger envelope (append-only chain)

The ledger (`packages/beacon/src/ledger.mjs`) wraps each receipt in a hash-chained entry:

```
entry = { seq, prev, receipt, hash }        hash = SHA-256(canonical{ seq, prev, receipt })
```

`verifyChain()` re-walks the chain and reports the first break with its index and reason
(`prev` linkage or `hash`), so any edit or reordering is detectable.

## Verify offline

```js
import { verifyReceipt } from "@aigovops/beacon";     // or the self-contained verifier in an export bundle
verifyReceipt(receipt, publicKeyPem);                 // → true iff the signature matches this exact body
```

Verification recomputes the canonical body (minus `signature`) and checks the ed25519 signature
against the public key. A single changed field — `gate`, `evidenceHash`, anything — fails it.

## The rule this contract exists to enforce

**One receipt format, emitted by every gate, verified by one verifier.** The schema
(`schema/receipt.schema.json`) is the machine-checkable form of that rule; the test
`packages/beacon/test/receipt-schema.test.mjs` fails CI if the emitted shape ever drifts from it.
