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

## Anoint checklist status (see `aigovops-library/plan/strategy/anoint-revive-checklist.md`)

| Phase | Status |
|---|---|
| **0 · Decide & declare** | ⏳ founder gate — owner not yet named; anoint not ratified |
| **1 · Revive the repo** | 🟡 in progress — current-Node parity + entry-point smokes **done** on this branch; license/README/tag pending |
| **2 · Lock the canonical contract** | ⏳ next — freeze the receipt schema doc, run `runConformance()`, add the cross-system verify test |
| **3–7 · publish · gate-service · Omni cutover · fold · lock** | ⏳ gated (see below) |

## Pending founder gates — NOT done here (irreversible)

None of these are touched on this branch; each is a human's explicit move:

1. **Name the revival owner** and ratify anoint (or choose archive). Without an owner, anoint = limbo.
2. **License** — this repo is **MIT**; the estate is **Apache-2.0**. Decision needed before publish.
3. **npm scope + publish** `@aigovops/*` — permanent; needs the founder account.
4. **Provision `get.aigovops.org`** (DNS/registrar) + the `curl | sh` endpoint.
5. **Omni prod cutover** — after a clean shadow-diff + green battery; run as `sudo -u omni`.
6. **The standing rule** — "one gate, no new parallel gate," enforced like the design-warden.

## README honesty to reconcile (proposed, not yet edited)

The README still states things that are aspirational until Phase 3 lands them — flag as "planned"
rather than shipping copy that overclaims (estate honesty rule):
- "**Live site:** https://bobrapp.github.io/…" — verify it actually serves before asserting.
- `curl -fsSL https://get.aigovops.org | sh` — the domain is unprovisioned.
- npm install lines — nothing is published yet (all packages `0.1.0`, no `publishConfig`).

*Prepared, not executed — humans hold the keys. Branch is local; nothing pushed; production
untouched.*
