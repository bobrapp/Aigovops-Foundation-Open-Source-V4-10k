#!/usr/bin/env bash
# M22 — reversible deploy. The agent runs this against a host the human provisioned. Pulls the image,
# (re)starts the gate + Caddy, and proves health. No secret is on disk — creds come from the broker
# (1Password) at runtime. Re-runnable and idempotent.
set -euo pipefail
COMPOSE="${AIGOVOPS_COMPOSE:-/opt/aigovops/compose.yml}"

echo "→ pulling the latest image"
docker compose -f "$COMPOSE" pull
echo "→ starting the gate + Caddy"
docker compose -f "$COMPOSE" up -d
echo "→ waiting for health"
for i in $(seq 1 30); do
  if curl -fsS http://localhost:8930/healthz >/dev/null; then echo "✓ gate healthy"; exit 0; fi
  sleep 2
done
echo "✗ gate did not become healthy" >&2
exit 1
