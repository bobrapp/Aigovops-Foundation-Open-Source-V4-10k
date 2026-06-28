# AiGovOps — 1-Click Product Plan (install everywhere · amazing UX · run by Jeeves)

The governance engine is built (M0–M9: 21 packages, 121 tests, a gate-as-a-service + the Studio). This
plan turns it into a **product anyone can install in one click and love using** — with three ways in:

- **Wizard** — a warm, TurboTax-grade web flow for **policy folks**. No code, ~10 minutes, ends in a signed
  "compliance certificate" and a live dashboard.
- **Single script** — `curl … | sh` (or `npx`, `docker run`, `helm install`) for **tech folks**. One command,
  idempotent, CI-friendly.
- **Jeeves agent-run** — an agent drives the *entire* install across any environment, automating everything
  reversible and pausing at the irreversible human gates (create account, enter credentials, DNS).

Design goal: the look and feel of **Intuit / Linear / Vercel** — clear, friendly, fast, delightful — backed
by as much **Apache-2.0, 10k★+** open source as possible.

---

## 1. Install everywhere — the surface matrix

One artifact, every doorway. Each path detects the **tier** (lab → laptop → container → firewall → VPS →
cloud, already in `@aigovops/install`) and wires the right backends.

| Surface | Command / action | Best for | Built on (Apache-2.0 / 10k★) |
|---|---|---|---|
| **One-liner** | `curl -fsSL get.aigovops.org \| sh` | tech folks, servers | Docker · k3s · Caddy |
| **npx** | `npx @aigovops/create` | Node devs, quick local | — |
| **Single container** | `docker run -p 8930:8930 aigovops/studio` | try it now | **Docker/moby** (72k) |
| **Full stack** | `docker compose up` | self-host, all features | Docker Compose |
| **Kubernetes** | `helm install aigovops aigovops/aigovops` | fleets, enclave | **Helm** (30k) · **Kubernetes** (123k) |
| **Lightweight k8s** | `aigovops up --k3s` (one VPS) | DigitalOcean droplet | **k3s** (33k) |
| **Cloud 1-click** | DigitalOcean Marketplace · Render · Railway · Fly deploy button | non-ops teams | k3s + cloud-init |
| **Desktop app** | download → double-click | non-technical, offline | **Tauri** (108k) |
| **Hosted SaaS** | sign in at aigovops.org | zero-install | the same stack, managed |
| **Wizard** | open `/` → Setup | policy folks | the gate API + Jeeves |

Everything terminates in the same place: the **Studio** (developer console) + the **Wizard/Dashboard**
(policy console), with **Caddy** providing automatic HTTPS so the 1-click paths are TLS-secured with no config.

---

## 2. The three setup paths

### 2a. Wizard — for policy folks (Intuit-grade, no code)
A browser flow that does the technical work behind a friendly face. One decision per screen, plain language,
a progress bar, reassurance, and a celebratory finish. **Jeeves does the hard part on every screen.**

1. **Welcome** — "Let's get your AI governed. ~10 minutes, no code." → *Start*
2. **What do you do?** — sector cards (Education · Healthcare · Finance · HR · Government · Other)
3. **Where do you operate?** — jurisdiction chips (EU · US · states · Global)
4. **What kind of AI?** — plain-language risk framing ("Does it make decisions about people?") → infers risk tier
5. **Which rules apply?** — auto-checked regulation cards (EU AI Act, GDPR, FERPA…) with one-line explanations:
   *"We picked these for you — uncheck any that don't apply."*
6. **Bring your policy** — paste · upload · or *"I don't have one yet"* (start from a template profile)
7. **Jeeves checks it** — friendly progress → a coverage score in plain words ("You're 40% covered — let's
   close the gaps"). *(calls `/v1/improve`)*
8. **Close the gaps** — each gap in plain language with a one-click **Add this** (Jeeves drafts the clause +
   the gate). *(calls `/v1/author`)*
9. **Connect sign-in** — one-click Google / Microsoft / Okta / Keycloak
10. **Set guardrails** — simple sliders (spend cap, who approves) with safe defaults *(maps to Caps)*
11. **See it work** — governed-vs-ungoverned in plain words: *"With governance ON, this risky request was
    stopped and logged."* *(calls `/v1/compare`)*
12. **Go live** — review → big green button → 🎉 → **a signed Compliance Certificate** (the Beacon receipt,
    rendered as a friendly cert) + a link to the dashboard.

The "certificate" is the magic: a non-technical user ends with **cryptographic, verifiable proof** they're
governed — without ever seeing a gate rule.

### 2b. Single script — for tech folks
```bash
curl -fsSL https://get.aigovops.org | sh        # detect tier, install runtime, bring up the stack, print URLs
# or, explicit:
aigovops up --tier 4 --with prometheus,opensearch,keycloak --profile "EU AI Act"
```
Behavior: detect OS/arch/tier → install Docker **or** k3s if absent (with consent) → pull the image → run
`aigovops-install` (the M3 guided onboarding, `--non-interactive` for CI) → health-check → print the Studio +
Console URLs and the first signed receipt. **Idempotent, scriptable, exit-code clean.** Config via flags,
env, or `aigovops.yaml`. Also `npx @aigovops/create`, `docker run`, `helm install`.

### 2c. Jeeves agent-run — the whole process, with human gates
Jeeves orchestrates end-to-end across any environment, automating everything reversible and **pausing at the
irreversible human gates** (the project's core principle: *agents do the bureaucracy; humans hold the keys*):

```
detect tier → propose plan (show it) → [HUMAN GATE: provision host / create account]
  → render secrets from the broker (never displayed) → deploy (Compose/Helm)
  → health-check every service → run onboarding (identity · caps · policy · gates · proof)
  → verify (conformance 6/6 + a signed receipt) → [HUMAN GATE: go-live / DNS] → hand back the dashboard
```
For cloud, Jeeves **drives the browser to the exact provider page and prefills it**, then pauses for the
human's single click — it never enters credentials or makes the irreversible move itself. This generalizes
the Foundation's existing "dead-simple" deploy agent.

---

## 3. The Apache-2.0 / 10k★ stack (install + UX layer)

Verified live on the GitHub API (2026-06-28). The product backends (OPA, Casbin, Trivy, Prometheus, Jaeger,
OpenSearch, Fluentd, Great Expectations, MLflow) are in `INTEROP.md`; this adds the **install + experience** layer.

| Need | Project | ★ | Role |
|---|---|--:|---|
| Containers | **Docker/moby** | 72k | the universal package |
| Orchestration | **Kubernetes** | 123k | fleet/enclave |
| Lightweight k8s | **k3s** | 33k | one-VPS / laptop 1-click |
| Packaging | **Helm** | 30k | `helm install aigovops` |
| Auto-HTTPS / proxy | **Caddy** | 74k | TLS with zero config on every 1-click path |
| API gateway (chokepoint) | **APISIX** | 17k | route every model call through the gate |
| Identity (1-click auth) | **Keycloak** · **Ory Kratos** · **Supabase** | 35k · 14k · 105k | OAuth/OIDC for the five roles |
| Desktop 1-click | **Tauri** | 108k | tiny, polished double-click app |
| Developer portal shell | **Backstage** | 34k | the technical Console + scorecards |
| Admin / internal tools UI | **Appsmith** | 40k | role-scoped operator screens |
| Analytics dashboards | **Apache Superset** | 74k | oversight + research dashboards |
| Quick data apps | **Streamlit** | 45k | embeddable analysis views |
| Control-plane IaC | **Crossplane** | 12k | declarative cloud provisioning |
| Agent orchestration | **Apache Airflow** | 46k | the Tier-1 agent fleet (+ our scheduler) |

**Honest gaps (told plainly):**
- **Secrets managers** have no Apache-2.0 ≥10k option (Vault → BUSL, OpenBao → MPL 6.5k). Our own
  `SecretsProvider` broker stays the contract; back it with cloud KMS / OpenBao / 1Password.
- **IaC**: OpenTofu (MPL, 29k) is the Terraform replacement; we prefer **Crossplane** (Apache) for the
  control-plane path.
- **Frontend component libraries**: Apache-2.0 ≥10k UI kits are scarce (most are MIT — React, Radix, shadcn).
  The polished Wizard/Console shell uses MIT libs, which is fine under this project's MIT license; the
  **zero-dependency Studio (already built)** covers the Apache/offline-embeddable case.

---

## 4. The UX design system — Intuit-grade

Two surfaces, one design language. **Don't make the policy author look at the developer's screen, and don't
slow the developer down with the consumer flow.**

| | **Wizard / Dashboard** (policy folks) | **Console / Studio** (tech folks) |
|---|---|---|
| Mood | warm, bright, encouraging (TurboTax) | focused, dense, technical (Linear) |
| Surface | light cream/off-white, generous whitespace, soft shadows, spot illustrations | the existing navy/teal Studio |
| Type | Fraunces display + a clean humanist sans body | Fraunces + DM Mono |
| Density | one decision per screen, big targets | tables, code, multi-panel |
| Output | a friendly **Compliance Certificate** | signed receipts, gate specs, attestations |

**"Design for Delight" principles (Intuit's own playbook):**
- **Plain language** — never show a Rego rule to a policy author; show *"AI decisions about people need a human
  reviewer — added ✓."*
- **Anticipate** — pre-fill from earlier answers; suggest the regulations before they ask.
- **Reassure** — progress bar, "we saved your work," "you can change this later."
- **Show the work happening** — Jeeves narrates ("Checking against 14 requirements…").
- **Celebrate** — confetti, the certificate, "You're governed." First-win in under 10 minutes.
- **Accessible by default** — WCAG 2.1 AA (the Foundation's `accessibility-audit` skill gates every screen),
  keyboard-first, dark/light, reduced-motion.

Shared **design tokens** (a small `tokens.css`/JSON) keep brand, color, type, spacing, and motion consistent
across the vanilla Studio, the React Wizard, the Tauri desktop app, and the Backstage/Appsmith consoles.

---

## 5. Architecture — how a 1-click install composes

```
                        ┌── Caddy (auto-HTTPS) ──┐
   browser ───────────► │  /         → Wizard    │
                        │  /studio   → Console   │
                        │  /v1/*     → Gate API  │ ◄── @aigovops/server (the unified gate)
                        └────────────┬───────────┘
                                     │  adapters (per tier)
        ┌───────────┬────────────┬───┴────────┬─────────────┬───────────┐
     Keycloak     OPA        Prometheus    OpenSearch     MLflow      Kong/APISIX
    (identity)  (policy)     (drift)       (evidence)   (registry)    (chokepoint)
                                     │
                             Airflow + scheduler  →  Tier-1 agents (regulation-watch, attestor, bundler)
```
- **Tier 1–3** (lab/laptop/container): the zero-dep core + local adapters — `docker run` or `npx`, instant.
- **Tier 4–6** (firewall/VPS/cloud): `docker compose` or `helm install` brings up the heavyweight backends;
  the gate routes to them via the M4 adapters; Caddy fronts TLS; gVisor (the M9 sandbox emitters) isolates tools.
- One image, profiles toggle which backends start (`--with`).

---

## 6. Build roadmap (continuing the milestone pattern)

| Milestone | Ships | Rough effort |
|---|---|---|
| **M10 — One-command install** ✅ | `aigovops up` CLI · `curl\|sh` · Docker image · Compose (gate + Caddy + Keycloak + OpenSearch + Prometheus) | shipped |
| **M11 — The Wizard** | the Intuit-grade web wizard on the gate API + Jeeves; the Compliance Certificate; design-token system | ~4–6 wk |
| **M12 — Jeeves agent-run installer** | the dead-simple agent end-to-end with human gates; browser-driven cloud provisioning | ~3–4 wk |
| **M13 — Install everywhere** | polished Helm chart · k3s 1-click · DigitalOcean/Render/Railway buttons · **Tauri** desktop app | ~4–5 wk |
| **M14 — Polished consoles** | Backstage/Appsmith/Superset-backed admin + analytics; full Intuit-grade design pass | ~4–6 wk |

**Total ≈ 18–25 engineer-weeks**, parallelizable and agent-accelerated. The wedge is **M10** (one command to
a running, TLS-secured gate) → **M11** (the wizard that makes it lovable) → **M12** (Jeeves does it for you).

## 7. Success metrics
- **Time-to-first-gate** < 10 min (wizard) / < 2 min (script).
- **Time-to-first-signed-certificate** in the same session.
- A non-technical user completes setup **with zero code** and a 0-touch Jeeves option.
- One container, one command, or one click — every environment.
- ≥ 90% of the stack is **Apache-2.0, 10k★+**; the rest is named and justified.

*Agents do the bureaucracy; humans hold the meaning — and humans hold the keys.*
