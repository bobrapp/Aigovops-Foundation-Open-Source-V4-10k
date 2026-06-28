# AiGovOps v4 — Milestones

The full build, milestone by milestone. Every one was tested, shipped to `main`, and verified
(CI + Pages green). End state: **27 workspaces · 160 tests · zero runtime dependencies · MIT · public**.

## Phase 0 — Foundation
| | What shipped |
|---|---|
| **Bootstrap** | the public repo created from a corrected install script; the three products (Beacon · Lantern · Umbrella) made real, orchestrated by Jeeves |
| **Blueprint** | the v4.0 product blueprint synthesized from public AI-governance law + a verified Apache-2.0 / 10k★ open-source stack (`docs/BLUEPRINT.md`) |

## Phase 1 — The governance kernel (M0–M5)
| | Milestone | What shipped |
|---|---|---|
| **M0** | Unify the gate | one `@aigovops/gate.decide()`: Umbrella criteria → Lantern drift → Caps → human decision → Beacon receipt → Secrets broker (replaced 3 divergent gates) |
| **M1** | Policy-Improver | `@aigovops/corpus` (cited regulatory requirements) + `policy-improver`: written policy → coverage + cited gaps |
| **M2** | Gate-Author + side-by-side | gaps → runnable Umbrella gates with Get/Stay/Recover exit states; governed-vs-ungoverned comparison |
| **M3** | Install + Control Room | tier-detecting onboarding (`install`) + role-scoped oversight dashboard (`control-room`) |
| **M4** | Heavyweight adapters | one contract, swappable backends: OPA · Prometheus · Keycloak · OpenSearch · Kong (timeout/retry/health) |
| **M5** | Tier-1 agents + scheduler | regulation-watch · compliance-attestor · audit-bundler; zero-dep cron + Airflow/GitHub-Actions exporters |
| **—** | Conversational Jeeves | offline `HeuristicLLM` + real `AnthropicLLM` (claude-opus-4-8, raw fetch); grounded conversational policy-improver; Jeeves as agent + site manager |

## Phase 2 — Products v-next + platform (M6–M9)
| | Milestone | What shipped |
|---|---|---|
| **M6** | Beacon v-next | hash-chained tamper-evident ledger · key rotation · in-toto/SLSA **DSSE attestation** (cosign-interoperable) · MLflow model signing |
| **M7** | Lantern v-next | statistical drift (**PSI / KL / K-S**) · Great-Expectations-style data-quality gates · continuous monitor + Alertmanager routing · Jaeger trace adapter |
| **M8** | Umbrella v-next | **framework profiles** (corpus → runnable per-regulation policy) · Casbin RBAC · Kyverno emitter · policy lifecycle (version/simulate/canary) · Trivy/ZAP/Semgrep gates |
| **M9** | Platform | **gate-as-a-service** HTTP API + `GateClient` SDK · persistence (`store`) · OS-level **sandbox** emitters (seccomp/nftables/gVisor) · **conformance** suite · Docker + Helm · the **Studio** developer console |

## Phase 3 — Productization (M10–M15)
| | Milestone | What shipped |
|---|---|---|
| **M10** | One-command install | `aigovops up` (tier→Compose generator + Caddy auto-HTTPS) · `curl \| sh` installer · falls back to the zero-dep node runtime |
| **M11** | The Wizard | warm, **Intuit-grade**, no-code setup at `/` → cited gaps → Jeeves authors gates → a **signed Compliance Certificate** (+ confetti) |
| **M12** | Jeeves agent-run installer | the irreversibility boundary as a state machine: auto-runs reversible steps, **pauses at every human gate** (provision · account · DNS · go-live); `aigovops setup` |
| **M13** | Install everywhere | `aigovops deploy render\|fly\|do\|cloud-init` · polished Helm chart (ingress/NOTES) · **Tauri** desktop scaffold |
| **M14** | Polished consoles | `@aigovops/tokens` design system · `/v1/metrics` (Prometheus) · Backstage · Superset · Appsmith integration descriptors |
| **M15** | Hosted open-core SaaS | `@aigovops/{plans,tenancy,billing}` · `/pricing` · per-tenant quotas + Stripe — funds the Foundation, **self-host stays unlimited & free** |

## Phase 4 — Depth
| | Milestone | What shipped |
|---|---|---|
| **M16** | Evidence vault & DSAR | every signed decision appended to a per-tenant, **hash-chained** Beacon ledger in the live gate; role-scoped query (`/v1/evidence`), chain verify, and a **signed audit / DSAR bundle** (`/v1/evidence/bundle`); surfaced in the Studio |
| **M17** | Depth — secrets · observability · SDK · release | real **Vault/OpenBao** secrets backend (async broker) · **OTLP** self-observability (`/v1/traces` → OTel Collector/Jaeger) · a **Python SDK** that passes cross-language conformance against a live gate · **GHCR image + release** automation (`.github/workflows/release.yml`) + `CHANGELOG.md` |

## Companion docs
- **[BLUEPRINT.md](./BLUEPRINT.md)** — the product architecture and grounding
- **[ROADMAP.md](./ROADMAP.md)** — kernel → production v-next, per product
- **[INTEROP.md](https://github.com/bobrapp/Aigovops-Foundation-Open-Source-V4-10k/blob/main/INTEROP.md)** — the verified Apache-2.0 / 10k★ backend stack
- **[PRODUCTIZATION.md](./PRODUCTIZATION.md)** — the 1-click product plan (wizard · script · Jeeves-run)
- **[SAAS.md](./SAAS.md)** — the hosted, open-core model and the no-lock-in guarantee

*Agents do the bureaucracy; humans hold the meaning — and humans hold the keys.*
