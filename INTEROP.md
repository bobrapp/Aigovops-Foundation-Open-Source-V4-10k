# Interoperability — standing on proven open source

AiGovOps v4 deliberately ships a **tiny, zero-dependency core** so the gate logic stays
auditable and portable. But "end to end" governance is a solved-in-parts problem: there
are mature, widely-adopted projects for each job our four components do. This document maps
each component to the open-source projects that can back it in production — and is honest
about which clear the bar you set (**Apache-2.0, ≥10,000 stars**) and which are canonical to
the domain but sit below it.

> Star counts and licenses below were pulled live from the GitHub API on **2026-06-27**
> (`gh api repos/<owner>/<repo>`), not from memory. They move; re-check before quoting.

## Tier 1 — Apache-2.0 **and** ≥10k stars (your bar)

| Project | Stars | Backs | What it gives us |
|---|--:|---|---|
| [Prometheus](https://github.com/prometheus/prometheus) | 64.8k | **Lantern** | Time-series monitoring + alerting — the signal source for drift and escalation. |
| [Apache Airflow](https://github.com/apache/airflow) | 46.0k | **Jeeves** | Battle-tested DAG orchestration for scheduling the gate pipeline at scale. |
| [Trivy](https://github.com/aquasecurity/trivy) | 36.6k | **Umbrella** | Vulnerability/IaC/secret scanning — ready-made *code gates*; SBOMs feed Beacon. |
| [Keycloak](https://github.com/keycloak/keycloak) | 35.3k | **cross-cutting** | OIDC/identity — the role-scoped oversight (stewards vs members) the design calls for. |
| [MLflow](https://github.com/mlflow/mlflow) | 26.7k | **Beacon** | Model registry, run tracking, lineage — the system-of-record Beacon signs over. |
| [Casbin](https://github.com/casbin/casbin) | 20.2k | **Umbrella** | Embeddable authorization (RBAC/ABAC); `node-casbin` drops straight into our core. |
| [Argo Workflows](https://github.com/argoproj/argo-workflows) | 16.8k | **Jeeves** | Kubernetes-native workflow engine — the cloud/enclave path for orchestration. |
| [Great Expectations](https://github.com/great-expectations/great_expectations) | 11.6k | **Lantern / Umbrella** | Declarative data "expectations" — data-quality gates and distributional drift. |
| [Open Policy Agent](https://github.com/open-policy-agent/opa) | 11.9k | **Umbrella** | The reference policy engine (Rego). Our compiler is the lab-grade stand-in for OPA. |

## Tier 2 — canonical to the domain, below your bar (noted for candor)

These are the *named standards* for our problem space; several are the right long-term
backend even though they don't (yet) clear 10k Apache stars. Worth knowing, not hiding.

| Project | Stars | License | Backs / note |
|---|--:|---|---|
| [Temporal](https://github.com/temporalio/temporal) | 21.3k | **MIT** | Durable orchestration for **Jeeves** — big and excellent, but MIT, not Apache. |
| [Falco](https://github.com/falcosecurity/falco) | 9.1k | Apache-2.0 | Runtime security/anomaly detection for the sandbox — just under the bar. |
| [Kyverno](https://github.com/kyverno/kyverno) | 7.9k | Apache-2.0 | Kubernetes policy-as-code — an **Umbrella** enforcement backend. |
| [Evidently](https://github.com/evidentlyai/evidently) | 7.6k | Apache-2.0 | The canonical **Lantern** ML drift/quality library (data + prediction drift). |
| [OpenTelemetry Collector](https://github.com/open-telemetry/opentelemetry-collector) | 7.2k | Apache-2.0 | Vendor-neutral telemetry pipeline feeding **Lantern**. |
| [Guardrails AI](https://github.com/guardrails-ai/guardrails) | 7.1k | Apache-2.0 | LLM input/output validation — an **Umbrella** guardrail backend. |
| [NeMo-Guardrails](https://github.com/NVIDIA/NeMo-Guardrails) | 6.6k | Apache-2.0* | Programmable LLM rails for **Umbrella** (*GitHub reports NOASSERTION; upstream is Apache-2.0). |
| [Sigstore cosign](https://github.com/sigstore/cosign) | 6.1k | Apache-2.0 | The reference signing/attestation tool — the production form of **Beacon** receipts. |
| [CloudEvents](https://github.com/cloudevents/spec) | 5.8k | Apache-2.0 | Event envelope spec for **Beacon** beacons/ledger entries. |
| [OpenFGA](https://github.com/openfga/openfga) | 5.4k | Apache-2.0 | Fine-grained (Zanzibar-style) authz for **Umbrella**. |
| [Gatekeeper](https://github.com/open-policy-agent/gatekeeper) | 4.2k | Apache-2.0 | OPA admission control for Kubernetes (**Umbrella** on k8s). |
| [OpenLineage](https://github.com/OpenLineage/OpenLineage) | 2.5k | Apache-2.0 | Lineage events for **Beacon** provenance. |
| [in-toto](https://github.com/in-toto/in-toto) | 1.0k | Apache-2.0* | Supply-chain attestation; conceptual sibling of Beacon receipts (*GH: NOASSERTION). |

## How we'd wire them in (without losing the auditable core)

The core stays as-is — the small `shared/gate.mjs` contract is the point. Each product grows
an **adapter** so the same PASS/FAIL/mitigation shape can be produced by a heavyweight backend:

- **Umbrella** → embed **Casbin** (`node-casbin`) for authz today; shell out to **OPA**
  (`opa eval`) for Rego policies; call **Trivy** for code/dependency gates.
- **Lantern** → scrape **Prometheus** for metric drift; run **Evidently** for ML
  data/prediction drift; ingest via the **OpenTelemetry** collector.
- **Beacon** → keep ed25519 receipts; graduate to **Sigstore/cosign** + **in-toto**
  attestations; treat **MLflow** as the model system-of-record we sign over.
- **Jeeves** → drive the pipeline with **Temporal** (durable) or **Airflow/Argo** (DAG)
  once runs outlive a single process; scope every view by **Keycloak** identity.

The discipline: **define the safety contract once at the interface; enforce it with the
strongest backend each environment allows.** These projects are those backends.
