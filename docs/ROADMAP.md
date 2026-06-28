# AiGovOps v4 — Roadmap to a production end-to-end solution

The **governance kernel is built** (M0–M5 + the conversational layer): the unified gate, the three real
products, the LLM-fronted Jeeves, the heavyweight adapters, and the Tier-1 agents — **96 tests, zero
runtime dependencies**. This roadmap is the path from that kernel to a **production, self-hostable,
end-to-end** next version of each product, with every external capability behind a swappable
**Apache-2.0** module.

The discipline holds throughout: **define the safety contract once; enforce it with the strongest backend
each environment allows.** The core stays tiny and zero-dependency; each module is reached through an
adapter that produces the same `{ status, mitigation, receipt }` shape.

## Done — the kernel (M0–M5)

| | Milestone | What shipped |
|---|---|---|
| M0 | Unified gate | one `decide()`: Umbrella → Lantern → Caps → human → Beacon → Secrets |
| M1 | Policy-Improver | written policy → cited gaps (from the public regulatory corpus) |
| M2 | Gate-Author + side-by-side | gaps → runnable gates with Get/Stay/Recover exit states; governed vs. ungoverned |
| M3 | Install + Control Room | tier-detecting onboarding + role-scoped oversight dashboard |
| M4 | Heavyweight adapters | OPA · Prometheus · Keycloak · OpenSearch · Kong (timeout/retry/health) |
| M5 | Tier-1 agents + scheduler | regulation-watch · compliance-attestor · audit-bundler; Airflow/Actions export |
| — | Conversational Jeeves | offline + Claude-backed LLM layer; agent manager + site manager |

## Next — production v-next, per product

Each product already has its **core logic** and its **primary backend adapter**. The remaining work is
persistence, the rest of the modules, and packaging.

### 🔦 Beacon — audit & proof  · **M6 ✅ (this release)**
| Capability | Module | Status |
|---|---|---|
| Hash-chained, tamper-evident ledger + NDJSON persistence | — (zero-dep) | ✅ |
| Key rotation (verify across current + retired) | — | ✅ |
| Standards attestation: in-toto Statement + SLSA provenance, DSSE-signed | **Sigstore/cosign**, **in-toto** | ✅ |
| Model system-of-record | **MLflow** | ✅ adapter |
| Searchable evidence store + query/DSAR | **OpenSearch** sink + the evidence vault | ✅ — hash-chained vault, role-scoped query, signed DSAR bundles (M16) |
| Log shipping | **Fluentd** / Fluent Bit | ✅ `FluentdSink` — metadata-only (M18) |

### 🪔 Lantern — monitoring & drift  · **M7 ✅ (this release)**
| Capability | Module | Status |
|---|---|---|
| Live metric / trace ingestion | **Prometheus** · **OpenTelemetry** · **Jaeger** | ✅ Prometheus + Jaeger + OTLP traces (M17) |
| Statistical / distributional drift (PSI, KL, K-S) | zero-dep stats (**Evidently**-compatible) | ✅ |
| Data-quality gates | **Great Expectations**-style suite | ✅ |
| Continuous monitor loop + alerting | scheduler ✅ + **Alertmanager** | ✅ Monitor + Alertmanager routing |
| Baseline + drift-history store | `DriftHistory` over the store contract | ✅ — per-field series + stability summary (M18) |

### ☂️ Umbrella — policy & gates  · **M8 ✅ (this release)**
| Capability | Module | Status |
|---|---|---|
| Heavyweight policy engine (Rego) | **OPA** | ✅ adapter + `toRego` emitter — authored gates → real Rego (M18) |
| Authorization (RBAC / ABAC) | **Casbin**-compatible `Enforcer` | ✅ |
| Security gates (scan / SAST / DAST) | **Trivy** · **OWASP ZAP** · **Semgrep** | ✅ |
| Framework profile library (EU AI Act, GDPR, HIPAA…) | corpus ✅ → `compileFrameworkProfile` | ✅ |
| Kubernetes enforcement | **Kyverno** | ✅ emitter |
| Policy lifecycle (version / simulate / canary) | `PolicyRegistry` | ✅ |

### 🧩 Platform — what makes all three one solution  · **M9 ✅ (this release)**
| Capability | Module | Status |
|---|---|---|
| Unified gate as a service (HTTP API + SDK client) | `@aigovops/server` + `GateClient` | ✅ |
| End-to-end **Studio UX** (policy author + developer) | served at `/`, wires M6–M9 in | ✅ |
| Identity & oversight | **Keycloak** · Backstage/Superset | ✅ adapter + dashboard |
| Gateway / OS-level sandbox | **Kong/APISIX** + gVisor/seccomp/nftables | ✅ adapter + sandbox emitters |
| Orchestration | **Airflow / Argo** | ✅ exporter → deploy |
| Persistence (ledger / baselines / policies / sessions) | `@aigovops/store` (Memory/File · Postgres/OpenSearch) | ✅ contract + impls |
| Packaging (Docker + Helm) | Dockerfile + Helm chart | ✅ |
| Conformance suite + reference SDK | `@aigovops/conformance` | ✅ |
| Secrets backends (Vault / KMS) | broker + **Vault/OpenBao** adapter | ✅ (M17) |
| Platform self-observability | **OTLP** traces → OTel Collector/Jaeger + Prometheus metrics | ✅ (M17) |
| Multi-language SDK | JS `GateClient` + **Python** SDK (cross-lang conformance) | ✅ (M17) |
| Release automation | GHCR image build/push + GitHub release on tag | ✅ (M17) |

## Total — the roadmap is built (every ◻️ closed)

- **The entire M0–M18 arc is shipped.** 27 workspaces, **169 tests**, **zero runtime dependencies**, every
  external capability behind a swappable Apache-2.0 adapter.
- **~20 open-source modules** integrated (see `INTEROP.md`). All three products are production-shaped; the
  platform layer (gate-as-a-service, persistence, OS sandbox, packaging, conformance) is in place; and the
  last module gaps — Rego emitter, Fluentd shipping, drift-history, Vault backend, OTLP traces, Grafana —
  are now closed.
- **What's left is ops, not product:** pointing those adapters at a specific deployment (a live Vault, a
  Prometheus/Grafana stack, an OTel collector) — environment-specific glue done at install time, not new
  modules.

*Agents do the bureaucracy; humans hold the meaning — and humans hold the keys.*
