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
  install/                ← M3 — onboarding installer: tier detect + guided first session
  control-room/           ← M3 — role-scoped oversight dashboard (zero-dep node:http server)
  adapters/               ← M4 — local + heavyweight backends (OPA, Keycloak, Prometheus, OpenSearch, Kong)
  agents/                 ← M5 — Tier-1 autonomous agents (regulation-watch, compliance-attestor, audit-bundler)
  scheduler/              ← M5 — zero-dep cron + exporters to a real Airflow DAG / GitHub Actions workflow
  server/                 ← M9 — the unified gate as a service (HTTP API) + GateClient SDK
  store/                  ← M9 — persistence: one KVStore contract, Memory + File impls
  sandbox/                ← M9 — OS-level rules: seccomp · nftables egress · gVisor emitters
  conformance/            ← M9 — the contract any AiGovOps gate (any language) must pass
jeeves/  src/index.mjs    ← manager-agent — delegates to @aigovops/gate
Dockerfile · deploy/helm/ ← M9 — container + Helm chart for the gate service
         src/llm.mjs      ← LLM client: HeuristicLLM (offline) + AnthropicLLM (claude-opus-4-8 via fetch)
         src/converse.mjs ← conversational policy-improver, grounded in the deterministic engine
         src/manager.mjs  ← Jeeves as agent manager (route sub-agents) + site manager (estate status)
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

## Install + Control Room (M3)

`onboard()` detects the deployment tier (1–6) and runs the guided first session —
**identity → caps → policy → gates → proof → cadence** — exercising the whole stack and signing an
onboarding-complete receipt. The **Control Room** is a zero-dependency dashboard whose every view is
scoped by role: steward sees all + the kill switch + export; auditor sees all + export; developer sees
gate health; policy-author and member see only their own effects; an unknown role sees nothing (fail-closed).

```bash
node packages/install/src/cli.mjs          # the guided walkthrough → signed receipt
node packages/control-room/src/cli.mjs     # dashboard at http://localhost:8920  (?role=steward vs ?role=member)
```

## Heavyweight adapters (M4)

The core stays tiny and zero-dependency; for production scale each capability has a pluggable
backend behind **one contract**. `selectBackends(tier)` returns local (zero-dep) implementations for
tiers 1–3 and heavyweight shims for tiers 4–6 — **OPA** (policy), **Prometheus** (drift), **Keycloak**
(identity), **OpenSearch** (audit), **Kong** (gateway). The shims are production-hardened — per-call
**timeout**, **retry with backoff** on 5xx/network, a typed **`AdapterError`** carrying the status,
configurable **auth headers**, and a **`health()`** probe per backend. Each takes an injectable
`transport`, so timeout/retry/mapping are unit-tested against canned responses — no live service, no
runtime dependency added.

## Conversational Jeeves (agent + site manager)

Jeeves fronts the policy-improver with a **conversational layer** whose facts stay honest: the LLM only
infers context from free text and phrases the reply — the **gaps and citations come from the deterministic
engine**, and the model is told to invent nothing. The LLM client is injectable: `HeuristicLLM` (offline,
deterministic, used in tests) or `AnthropicLLM` (real **claude-opus-4-8** via raw `fetch`, keeping the core
zero-dependency). As **agent manager**, Jeeves routes a request to the right sub-agent; as **site manager**,
`status()` gives a role-aware view over the whole estate.

```js
import { Jeeves, HeuristicLLM, AnthropicLLM } from "@aigovops/jeeves";

const jeeves = new Jeeves({ llm: new HeuristicLLM() });   // or new AnthropicLLM() with ANTHROPIC_API_KEY
const { report, reply } = await jeeves.converse("Our EU school runs an AI tutor for students");
// report.gaps → cited gaps (deterministic) · reply → grounded natural-language summary
```

## Tier-1 autonomous agents (M5)

Three agents run on a schedule with no human trigger, committing signed evidence:
**regulation-watch** (refreshes the requirement set from the corpus **or a live JSON feed** via
`watchFeed()`, then diffs against the prior snapshot), **compliance-attestor** (runs a batch through the
gate and signs the weekly evidence bundle), **audit-bundler** (tallies the ledger into a signed auditor
report). The
**scheduler** is a zero-dep cron engine that can run them locally — and **exporters** emit the same job set
as a real Airflow DAG or GitHub Actions workflow, so they deploy to production infra without either becoming
a dependency. Define the schedule once; run it wherever the environment allows.

```bash
node packages/agents/src/run.mjs regulation-watch     # run an agent directly
# emit deploy artifacts:
node -e "import('./packages/scheduler/src/index.mjs').then(async s=>{const{TIER1_JOBS}=await import('./packages/agents/src/index.mjs');process.stdout.write(s.toAirflowDags(TIER1_JOBS))})" > dags/aigovops_tier1.py
```

## Gate as a service · platform (M9)

The unified gate runs as a **zero-dependency HTTP service** so any language can call the same contract,
with a reference **SDK client**. The platform layer also adds durable **persistence** (one `KVStore`
contract), the **OS-level sandbox** emitters (seccomp · nftables egress · gVisor), a **conformance suite**
any implementation must pass, and **Docker + Helm** to deploy it.

The same server also hosts the **Studio** — an end-to-end web UX for both protagonists: a *policy author*
improves a written policy against the corpus (cited gaps, framework starters), and a *developer* authors
runnable gates, proves them governed-vs-ungoverned, and signs evidence — with each version's production
capability wired in (M6 attestation · M7 drift · M8 profiles · M9 conformance). Open `/` after starting:

```bash
node packages/server/src/cli.mjs     # Studio + gate API at http://localhost:8930  (open / in a browser)
curl -s localhost:8930/healthz
curl -s -XPOST localhost:8930/v1/decide -d '{"profile":"baseline","payload":{"model":"claude-opus-4-8","humanApproved":true}}'
docker build -t aigovops . && docker run -p 8930:8930 aigovops   # or: helm install gate deploy/helm/aigovops
```

```js
import { GateClient } from "@aigovops/server";
const gate = new GateClient({ baseUrl: "http://localhost:8930" });
await gate.decide({ profile: "baseline", payload: { model: "claude-opus-4-8", humanApproved: true } });

import { runConformance } from "@aigovops/conformance";
runConformance();   // → { conformant: true, passed: 6, total: 6 } — the contract any port must pass
```

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
