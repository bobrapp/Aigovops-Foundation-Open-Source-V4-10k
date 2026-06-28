#!/bin/sh
# AiGovOps — one-line installer.   curl -fsSL https://get.aigovops.org | sh
# Brings up a running, TLS-secured gate. Full stack if Docker is present, else the gate alone.
set -eu

say() { printf '\033[36m▸\033[0m %s\n' "$1"; }
err() { printf '\033[31m✗\033[0m %s\n' "$1" >&2; exit 1; }

command -v git  >/dev/null 2>&1 || err "git is required."
command -v node >/dev/null 2>&1 || err "Node.js 20+ is required — https://nodejs.org"

REPO="${AIGOVOPS_REPO:-https://github.com/bobrapp/Aigovops-Foundation-Open-Source-V4-10k.git}"
DIR="${AIGOVOPS_DIR:-$HOME/.aigovops/app}"
PORT="${PORT:-8930}"

say "Fetching AiGovOps…"
if [ -d "$DIR/.git" ]; then
  ( cd "$DIR" && git pull -q )
else
  mkdir -p "$(dirname "$DIR")"
  git clone --depth 1 -q "$REPO" "$DIR"
fi
cd "$DIR"

if command -v docker >/dev/null 2>&1 && [ "${AIGOVOPS_RUNTIME:-}" != "node" ]; then
  say "Docker found — bringing up the full stack (gate · Caddy · Keycloak · OpenSearch · Prometheus)…"
  if [ -n "${AIGOVOPS_WITH:-}" ]; then
    node packages/cli/src/cli.mjs up --tier "${AIGOVOPS_TIER:-4}" --with "$AIGOVOPS_WITH"
  else
    node packages/cli/src/cli.mjs up --tier "${AIGOVOPS_TIER:-4}"
  fi
else
  say "Starting the gate (zero dependencies, no Docker needed)…"
  ( PORT="$PORT" node packages/server/src/cli.mjs >/dev/null 2>&1 & )
  sleep 1
  printf '\033[32m✓\033[0m AiGovOps is up.\n'
  printf '   Studio:  http://localhost:%s/\n' "$PORT"
  printf '   API:     http://localhost:%s/v1\n' "$PORT"
  printf '   Health:  http://localhost:%s/healthz\n' "$PORT"
fi
