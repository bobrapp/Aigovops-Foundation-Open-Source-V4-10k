# The agent-driven runbook (Jeeves + 1Password)

**The rule:** automate everything reversible; resolve every credential from **1Password**; the human
performs only the irreversible/outward gates. Manual work is the exception, not the default.

Jeeves manages the **Ops agent** (`@aigovops/ops-agent`, the `ops-runner` sub-agent). It turns the ops
backlog into a runbook and executes it — pausing only where a human must act.

## How credentials work — store once, never paste

Credentials live in **1Password**, read through the broker's `OnePasswordProvider` (the Connect REST API —
no `op` CLI, no app, no per-step paste). The agent resolves each one **through the governed broker**: it
mints a scoped, expiring, single-use grant and redeems it. Even the agent's own credential access is
governed, scoped, and logged.

```
broker = SecretsProvider.default()         # env → 1Password → Vault → keychain
# in 1Password (one time), create vault items titled exactly:
#   deploy-ssh-key · apple-signing-cert · windows-signing-cert · stripe-live-key · npm-token
OP_CONNECT_HOST=https://op-connect:8080  OP_CONNECT_TOKEN=…  OP_VAULT=AiGovOps  node …
```

A credential that isn't stored yet doesn't become a paste prompt — the runbook stops with a **one-time**
"store `<name>` in 1Password" instruction, and every run afterward is hands-free.

## The runbook

```bash
aigovops-ops --host vps --domain app.aigovops.org --desktop --saas --npm
```

| # | step | who | credential (1Password) |
|---|---|---|---|
| 1 | Publish the image (make GHCR public) | ⛔ human | — |
| 2 | Stand up observability (Prometheus/Grafana/Jaeger/OTel) | ✓ agent | — |
| 3 | Provision the host | ⛔ human | — |
| 4 | Deploy the stack + health-check | ✓ agent | `deploy-ssh-key` |
| 5 | Build the desktop installers | ✓ agent | — |
| 6 | Sign & notarize the installers | ✓ agent | `apple-signing-cert`, `windows-signing-cert` |
| 7 | Wire live billing | ✓ agent | `stripe-live-key` |
| 8 | Publish the packages to npm | ✓ agent | `npm-token` |
| 9 | Point the domain (DNS) | ⛔ human | — |
| 10 | Go live | ⛔ human | — |

**6 steps automated, 4 human gates** — and the 4 are exactly the irreversible/outward actions: changing
access, creating a host, changing DNS, flipping the switch. Everything that used to be a credential paste
is now a one-time 1Password entry the agent reads on every run.

## Ready-for-Human gates (M22)

Every step is engineered ahead of time, so a gate is never "go figure this out" — it's "click this."
`prepareStep` stages each step with its exact command, prefilled config, deep-link, and computed values,
backed by real artifacts in `deploy/`:

| gate | what's staged for you |
|---|---|
| Publish the image | the package settings deep-link + a ready `gh api … visibility=public` command |
| Provision the host | `deploy/provision/cloud-init.yaml` (prefilled) + the cloud console new-droplet link |
| Point the domain | the exact A record computed from the provisioned IP (`app.aigovops.org → <ip>`, TTL 300) |
| Go live | a green preflight (`/healthz`, `/v1/conformance`, TLS) before the one irreversible click |

The auto steps in between carry their runnable command and pull credentials from 1Password. The
`/approvals` console shows a `READY` badge on every step — nothing left to prepare, only your decision.

## Why this shape

It's the project's core principle applied to its own operations: **agents do the bureaucracy; humans hold
the meaning — and humans hold the keys.** The agent never holds a raw secret on disk and never makes an
irreversible move. See [the system rule](#) — codified so every future ops task follows it by default.
