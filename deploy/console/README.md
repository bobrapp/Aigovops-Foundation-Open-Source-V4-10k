# Polished consoles (M14)

The gate exposes a stable API (`/openapi.json`), governance metrics (`/v1/metrics`, Prometheus format),
and a conformance check (`/v1/conformance`). Three best-in-class **Apache-2.0** consoles plug straight in —
no custom backend:

| Console | Project (★) | What it gives you | Wire it with |
|---|---|---|---|
| **Developer portal** | Backstage (34k) | catalog entry, API docs, governance scorecard | `catalog-info.yaml` |
| **Analytics dashboards** | Prometheus (65k) → Grafana / **Superset** (74k) | decision rate, pass/fail, drift, conformance over time | `prometheus-scrape.yml` |
| **Admin / operator UI** | Appsmith (40k) | role-scoped operator screens over the gate API | `appsmith-datasource.json` |

The shared **design tokens** (`@aigovops/tokens`) keep the Wizard, Studio, desktop app, and these consoles
visually consistent — the Intuit-grade design pass. `toCss()` emits the CSS custom properties any surface
imports.
