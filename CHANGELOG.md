# Changelog

All notable milestones. The full index with detail: [docs/MILESTONES.md](docs/MILESTONES.md).

## [4.0.0] — Unreleased
The complete v4 build: a zero-dependency, MIT-licensed AI-governance platform — kernel → products →
platform → productization → SaaS → depth. **27 workspaces, 160+ tests, every external capability behind a
swappable Apache-2.0 adapter.**

### Kernel (M0–M5)
- **M0** unified gate · **M1** policy-improver (cited gaps) · **M2** gate-author + governed/ungoverned ·
  **M3** install + Control Room · **M4** heavyweight adapters (OPA/Prometheus/Keycloak/OpenSearch/Kong) ·
  **M5** Tier-1 agents + scheduler (Airflow/Actions export) · conversational Jeeves (offline + Claude).

### Products v-next + platform (M6–M9)
- **M6** Beacon (hash-chained ledger, rotation, in-toto/SLSA DSSE, MLflow) · **M7** Lantern (PSI/KL/KS drift,
  Great-Expectations gates, Alertmanager, Jaeger) · **M8** Umbrella (framework profiles, Casbin, Kyverno,
  lifecycle, Trivy/ZAP/Semgrep) · **M9** platform (gate-as-a-service + SDK, store, gVisor sandbox,
  conformance, Docker/Helm, the Studio).

### Productization (M10–M15)
- **M10** one-command install · **M11** the Wizard (→ signed certificate) · **M12** Jeeves agent-run installer ·
  **M13** install everywhere (deploy generators, Helm, Tauri) · **M14** consoles (tokens, /v1/metrics,
  Backstage/Superset/Appsmith) · **M15** hosted open-core SaaS (plans/tenancy/billing; self-host stays free).

### Depth (M16–M17)
- **M16** evidence vault & DSAR (hash-chained, queryable, signed bundles).
- **M17** Vault/OpenBao secrets backend · OTLP self-observability (`/v1/traces` → OTel Collector/Jaeger) ·
  Python SDK + cross-language conformance · GHCR image + release automation.

### Install
`curl -fsSL get.aigovops.org | sh` · `aigovops up` · `docker run … ghcr.io/<owner>/aigovops` · `helm install`
· the Tauri desktop app · or the hosted SaaS. Self-host is unlimited and free, forever.
