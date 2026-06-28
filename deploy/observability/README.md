# Observability stack (M19 ops)

The Ops agent's first reversible milestone, executed: a one-command monitoring stack for the gate.
Prometheus scrapes `/v1/metrics` (M14); the gate exports OTLP traces (M17) → OTel Collector → Jaeger;
Grafana auto-provisions the datasource and the [gate dashboard](../console/grafana-dashboard.json).

```bash
docker compose -f deploy/observability/compose.yml up -d

# point the gate at the collector and run it
AIGOVOPS_OTLP_ENDPOINT=http://localhost:4318 node packages/server/src/cli.mjs
```

| Service | URL | What |
|---|---|---|
| Grafana | http://localhost:3000 | "AiGovOps — Governed Core" dashboard (anon access on) |
| Prometheus | http://localhost:9090 | scrapes the gate's metrics every 15s |
| Jaeger | http://localhost:16686 | the gate's request spans |
| OTel Collector | :4318 (http) / :4317 (grpc) | OTLP ingest → Jaeger |

All reversible: `docker compose ... down -v` removes it. No host, no credentials — which is why the
agent runs this one itself. The next steps (provision, deploy, go-live) are human gates.
