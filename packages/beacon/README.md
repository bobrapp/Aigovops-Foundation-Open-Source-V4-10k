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

## v-next (M6)

- **Hash-chained ledger** (`Ledger`) — append-only, tamper-evident (each entry links to the
  previous by hash); `verifyChain()` detects any edit/reorder/deletion; NDJSON persistence; an
  optional `sink` streams every entry to a searchable store (e.g. the OpenSearch adapter).
- **Key rotation** (`KeyRing`) — sign with the current key; verify against current **or** retired,
  so receipts signed before a rotation still verify.
- **Standards attestation** (`attest`) — turns a receipt into an **in-toto** Statement carrying a
  **SLSA** provenance predicate, wrapped in a **DSSE** envelope that Sigstore/cosign and in-toto
  verifiers consume. `verifyDsse()` checks it offline.
- **MLflow** (`signMlflowModel`) — signs a receipt over a registered model version (run, stage, URI)
  so evidence attests to a specific model in the registry.
