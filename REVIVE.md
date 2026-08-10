# REVIVE — staging the anoint path (T0-DECIDE)

*Branch `revive/2026-08-anoint`, 2026-08-09. This repo was frozen at `c334da8` (2026-06-28). The
estate strategy review (in `aigovops-library/plan/strategy/`) found this monorepo already contains
the unified gate + the full authoring wedge, proven, but called by nothing live — a fourth
parallel island. This branch **stages the reversible first steps of the anoint path** (revive as
the canonical core + product). It changes nothing that reaches production and is not pushed.*

> **Decision status:** anoint is **proposed, not ratified.** The T0-DECIDE call (anoint vs archive)
> and its sub-decisions are founder gates — see below. This branch prepares; a human decides.

## Verified on this branch (reversible, non-prod)

- **Current-Node parity — the core M0 revive check.** `npm test` → **188 pass / 0 fail / 0 skip**
  on **Node v26.4.0** (the repo was built on Node 20-era). The zero-dependency design held: no
  bit-rot, no install, nothing to patch.
- **The loop runs.** `node jeeves/src/index.mjs` → `PASS` with a signed receipt (umbrella → lantern
  → beacon).
- **The wedge runs end to end.** `policy-improver` → cited gaps (0/14 coverage on the sample
  education policy, each gap carrying its primary citation + a candidate gate); `side-by-side` →
  ungoverned runs unchecked vs governed BLOCKED on 11 cited clauses, then PASS + receipt once
  compliant.
- **The gate-service boots.** `node packages/server/src/cli.mjs` → `/healthz` ok; `POST /v1/decide`
  returns `FAIL` on a non-Claude model and `PASS` + an Ed25519 receipt when compliant. The Studio
  (`/` wizard + `/studio` console) renders and drives the wedge live.

## Phase 2 — the canonical contract, locked on this branch

- **Conformance green.** `runConformance()` → `{ conformant: true, passed: 6, total: 6 }` — the
  contract any port (in any language) must pass.
- **Receipt schema frozen.** [`schema/receipt.schema.json`](schema/receipt.schema.json) (machine)
  + [`docs/RECEIPT-SCHEMA.md`](docs/RECEIPT-SCHEMA.md) (human), derived from the real signer
  (`packages/beacon/src/sign.mjs`): the six-field signed unit + the ledger's hash-chain envelope.
- **Verify / drift pin added.** `packages/beacon/test/receipt-schema.test.mjs` (5 checks):
  a signed receipt validates against the frozen schema, carries **exactly** the frozen field set
  (any silent format drift fails CI), verifies offline, breaks on tamper, and the canonicalization
  is order-independent. **Full suite now 193/193** (188 + 5), 0 fail.
- **⚠️ Cross-system finding (surfaced, not yet resolved).** This repo canonicalizes with
  **sorted-key `JSON.stringify`**, *not* full **RFC 8785 (JCS)** like the Library's Beacon. They
  agree on simple objects but can diverge on number formatting / non-ASCII — so a receipt signed by
  one could fail verification by the other. **Pinning canonicalization to one spec (recommend RFC
  8785) is a prerequisite for "verified anywhere"** — a T0-DECIDE follow-up, flagged in
  `docs/RECEIPT-SCHEMA.md`, not changed here.
- **Corpus-pin:** N/A on this branch — the corpus is embedded in `packages/corpus`. The Omni↔Library
  corpus-SHA pin is a Phase-5 live-migration concern, not a monorepo one.

## Anoint checklist status (see `aigovops-library/plan/strategy/anoint-revive-checklist.md`)

| Phase | Status |
|---|---|
| **0 · Decide & declare** | ⏳ founder gate — owner not yet named; anoint not ratified |
| **1 · Revive the repo** | 🟡 in progress — current-Node parity, entry-point smokes, **README honesty reconciled**; license decision + baseline tag pending |
| **2 · Lock the canonical contract** | ✅ done on this branch — schema frozen, conformance green, verify/pin test added (see below) |
| **3 · Publish & distribute** | 🟡 readiness proven — `scripts/publish-check.mjs` → **28/28 publishable, 0 blockers**; actual publish + npm-scope + `get.aigovops.org` are founder gates |
| **4–7 · gate-service · Omni cutover · fold · lock** | ⏳ gated (Docker image build verified locally; staging/prod deploy + cutover are founder gates) |

## Pending founder gates — NOT done here (irreversible)

None of these are touched on this branch; each is a human's explicit move:

1. **Name the revival owner** and ratify anoint (or choose archive). Without an owner, anoint = limbo.
2. **License** — this repo is **MIT**; the estate is **Apache-2.0**. Decision needed before publish.
3. **npm scope + publish** `@aigovops/*` — permanent; needs the founder account.
4. **Provision `get.aigovops.org`** (DNS/registrar) + the `curl | sh` endpoint.
5. **Omni prod cutover** — after a clean shadow-diff + green battery; run as `sudo -u omni`.
6. **The standing rule** — "one gate, no new parallel gate," enforced like the design-warden.

## README honesty — reconciled on this branch (verified first)

Per the estate "verify before asserting" rule, each claim was checked live before editing:
- **"Live site" → verified TRUE, kept.** `https://bobrapp.github.io/Aigovops-Foundation-Open-Source-V4-10k/`
  returns **HTTP 200**. (Verifying first *saved* a real claim from being wrongly softened.)
- **`get.aigovops.org` installer → false, reconciled.** Domain does **not resolve** (HTTP 000). The
  `curl | sh` line is now marked *planned*; the working clone command leads.
- **npm packages → false, reconciled.** Root is `private`, packages `0.1.0`, no `publishConfig` →
  nothing on npm. A Status note now says so and clarifies the `@aigovops/*` imports resolve in-clone.
- **Hosted SaaS → qualified.** Billing/tenancy are scaffold-stage; the line now says so (self-host
  is the only path today).

No claim was softened without checking it; the one true claim was kept.

*Prepared, not executed — humans hold the keys. Branch is local; nothing pushed; production
untouched.*
