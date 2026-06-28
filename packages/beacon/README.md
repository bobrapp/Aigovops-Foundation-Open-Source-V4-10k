# Beacon

Audit & proof — listens, identifies models/patterns, and **signs verifiable evidence receipts**.

PASS / FAIL — never MAYBE.

## Evidence receipts

When Beacon's gate passes, it signs a small JSON proof that a piece of evidence existed
and passed at a moment in time. Anyone with the public key can verify it **offline** — no
network, no trust in our code.

- **Algorithm:** ed25519 (`node:crypto`, zero dependencies)
- **Hash:** SHA-256 over a canonical (key-sorted) form of the evidence
- **Schema:** `aigovops.beacon.receipt/1`

```js
import { signEvidence, verifyReceipt } from "@aigovops/beacon";

const out = signEvidence({ configured: true, payload: { model: "claude-opus-4-8", decision: "PASS" } });
// out.receipt  → signed receipt   out.publicKey → PEM
verifyReceipt(out.receipt, out.publicKey); // → true ; tamper any field → false
```

Run the live demo: `node packages/beacon/src/index.mjs`

In production the signing key comes from the secrets broker, never from disk —
agents propose, humans hold the keys.
