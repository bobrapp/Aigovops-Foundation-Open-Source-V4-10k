# AIGovOps Foundation — Open Source v4

> **Get to YES. Stay at YES. Recover to YES.**
> No maybes allowed.

An end-to-end open-source AI governance operations platform built on three
products — **Beacon** (audit & proof), **Lantern** (monitoring & drift),
**Umbrella** (policy & gates) — orchestrated by the **Jeeves** manager-agent.

## Products

| Product | Role | Gate Logic |
|---------|------|------------|
| **Beacon** | Listens, identifies models/patterns, proposes heuristics, signs evidence receipts | PASS / FAIL — never MAYBE |
| **Lantern** | Semantic diff, drift detection, escalation, change monitoring | PASS / FAIL — never MAYBE |
| **Umbrella** | Policy compiler, code gates, automated enforcement, framework profiles | PASS / FAIL — never MAYBE |

## Three Laws of Gates

1. **Get to YES** — every control has a deterministic pass condition
2. **Stay at YES** — continuous monitoring re-runs gates on every change
3. **Recover to YES** — every FAIL ships a mitigation checklist and automated fix path

## Structure

```
shared/            ← the Yes-Gate: PASS / FAIL, never MAYBE (single source of gate logic)
packages/
  beacon/          ← audit & proof — signs evidence receipts
  lantern/         ← monitoring & drift — semantic diff, escalation
  umbrella/        ← policy & gates — policy compiler, framework profiles
jeeves/            ← manager-agent — orchestrates the three products
.github/workflows/ ← ci.yml (node --test)
```

## Quick start

```bash
git clone https://github.com/bobrapp/Aigovops-Foundation-Open-Source-V4-10k.git
cd Aigovops-Foundation-Open-Source-V4-10k
node --test          # run the gate tests (Node 20+, zero dependencies)
node jeeves/src/index.mjs   # see Jeeves run all three gates
```

## Governance principle

Agents do the bureaucracy; humans hold the meaning — and humans hold the keys.
Every irreversible move pauses for an explicit human decision.

— The AiGovOps Foundation · Bob Rapp & Ken Johnston
