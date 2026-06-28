# AIGovOps Foundation — Open Source v4

> **Get to YES. Stay at YES. Recover to YES.**
> No maybes allowed.

**Live site:** https://bobrapp.github.io/Aigovops-Foundation-Open-Source-V4-10k/

An end-to-end open-source AI governance operations platform built on three
products — **Beacon** (audit & proof), **Lantern** (monitoring & drift),
**Umbrella** (policy & gates) — orchestrated by the **Jeeves** manager-agent.

## Products

| Product | Role | Implemented today |
|---------|------|------------|
| **Beacon** | Audit & proof — signs evidence receipts | ed25519 receipts over a SHA-256 canonical hash; verifies **offline** |
| **Lantern** | Monitoring & drift — semantic diff, escalation | structural + numeric drift vs a baseline, with tolerance + escalation levels |
| **Umbrella** | Policy & gates — policy compiler, framework profiles | declarative policy → deterministic evaluator; 8 operators; named profiles |
| **Jeeves** | Manager-agent — orchestration | runs Umbrella → Lantern → Beacon and signs the verdict end to end |

All four are real, zero-dependency Node, and covered by tests (`node --test`). Each emits the
same `{ status, mitigation }` gate shape — PASS / FAIL, never MAYBE.

## Three Laws of Gates

1. **Get to YES** — every control has a deterministic pass condition
2. **Stay at YES** — continuous monitoring re-runs gates on every change
3. **Recover to YES** — every FAIL ships a mitigation checklist and automated fix path

## Structure

```
shared/gate.mjs          ← the Yes-Gate primitive: PASS / FAIL, never MAYBE (single source)
packages/
  gate/    src/index.mjs  ← THE unified decision path (M0): the one decide() below
  beacon/  src/sign.mjs   ← ed25519 signing, canonical hashing, offline verify
  lantern/ src/diff.mjs   ← structural + numeric drift engine
  umbrella/src/compile.mjs← policy compiler + evaluator + framework profiles
  caps/    src/index.mjs  ← capability dial (read→propose→act→auto) + hard caps, fail-closed
  secrets/ src/index.mjs  ← SecretsProvider broker: issue→redeem→revoke; agents never see raw creds
  corpus/  src/index.mjs  ← regulatory corpus: cited requirements (EU AI Act, GDPR, NIST, FERPA…)
  policy-improver/        ← M1 — written policy → corpus → cited gap analysis + candidate gates
  gate-author/            ← M2 — candidate gates → runnable Umbrella policy + Get/Stay/Recover exit states
  side-by-side/           ← M2 — governed vs. ungoverned comparison, with citations
jeeves/  src/index.mjs    ← manager-agent — delegates to @aigovops/gate
docs/index.html           ← landing page (GitHub Pages) with a live Yes-Gate demo
.github/workflows/        ← ci.yml (node --test) · pages.yml (deploys docs/)
INTEROP.md                ← Apache-2.0 / 10k★ projects that back each component
```

## The unified gate (M0)

One `decide()` replaces the three gates that had drifted apart across the Library, Omni, and
this repo. Every effector — in any language, in or out of process — calls the same path:

```
decide(proposal):
  1. Umbrella.compile(policy).evaluate(payload)   → criteria           Get to YES
  2. Lantern.detectDrift(baseline, current)       → drift / escalation  Stay at YES
  3. human decision (only if irreversible)        → approve | deny      humans hold the keys
  4. Caps.check(actor, cost)                       → hard ceiling        pause, don't push
  5. Beacon.sign(decision)                         → receipt (deny too)  proof
  6. on approve → Secrets.issue(scope, ttl)        → brokered grant      never a raw secret
```

## Policy-Improver (M1)

The wedge: a policy author brings a **written policy** (prose); the engine maps it against the
applicable **regulatory corpus**, scores coverage, and returns **cited gaps** — each with a suggested
clause and a candidate Umbrella gate (the hand-off to the developer). Deterministic and testable;
citations come from the corpus, nothing is invented. A conversational LLM layer can wrap it for polish.

```js
import { improve, toMarkdown } from "@aigovops/policy-improver";

const report = improve("We use an AI tutor and tell students it is AI.",
  { sector: "education", jurisdiction: "EU", dataTypes: ["personal", "children"], riskTier: "high" });
// report.gaps[i] → { framework, citation, why, suggestedClause, suggestedGate }
console.log(toMarkdown(report));   // a cited improvement brief
```

Try it: `node packages/policy-improver/src/index.mjs`

## Gate-Author + side-by-side (M2)

The developer's half: M1's candidate gates become a **runnable Umbrella policy**, each gate carrying
its three exit states (Get to YES = criteria · Stay at YES = Lantern re-check · Recover to YES =
mitigation). `authorPolicy()` compiles the result, so it's guaranteed to run on the unified gate.
Then **side-by-side** runs the same request governed vs. ungoverned and narrates exactly what the gate
caught — with citations (a gate controlled by two regulations carries both).

```js
import { improve } from "@aigovops/policy-improver";
import { authorPolicy, compliantExample } from "@aigovops/gate-author";
import { compare } from "@aigovops/side-by-side";

const authored = authorPolicy(improve(writtenPolicy, context));   // prose → runnable cited gates
compare({ payload: { model: "gpt-4" }, authored });               // → governed BLOCKS, ungoverned runs
compare({ payload: compliantExample(authored.policy), authored });// → governed PASS + signed receipt
```

End-to-end demo (prose → gaps → gates → governed/ungoverned): `node packages/side-by-side/src/index.mjs`

## Quick start

```bash
git clone https://github.com/bobrapp/Aigovops-Foundation-Open-Source-V4-10k.git
cd Aigovops-Foundation-Open-Source-V4-10k
node --test                       # run all gate tests (Node 20+, zero dependencies)

node jeeves/src/index.mjs         # full pipeline → a signed, verified receipt
node packages/beacon/src/index.mjs    # sign + verify an evidence receipt
node packages/lantern/src/index.mjs   # detect drift beyond tolerance
node packages/umbrella/src/index.mjs  # evaluate the baseline policy profile
```

## Backing it with proven open source

The core stays tiny and auditable on purpose. For production scale, each component has a
mature Apache-2.0 backend — see **[INTEROP.md](./INTEROP.md)** (OPA, Prometheus, MLflow,
Trivy, Airflow, Keycloak, Casbin, Great Expectations, …), with live-verified star counts.

## Governance principle

Agents do the bureaucracy; humans hold the meaning — and humans hold the keys.
Every irreversible move pauses for an explicit human decision.

— The AiGovOps Foundation · Bob Rapp & Ken Johnston
