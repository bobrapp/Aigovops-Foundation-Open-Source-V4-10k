# Deploy the Studio to a non-production URL (for Bob & Ken)

*Goal: a public, non-production URL where you and Ken can drive the **real** server-backed
Studio — the no-code wizard, the policy-improver, the developer console — not just the static
demo. Staged 2026-08-09 on `revive/2026-08-anoint`. The build runs in the host's cloud, so **no
local Docker is needed.***

## What deploys
`./Dockerfile` → `node packages/server/src/cli.mjs` on port 8930, which serves:
- `/` — the 8-step no-code **Get Governed** wizard
- `/studio` — the developer console (**policy-improver → gate-author → side-by-side**)
- `/v1/decide` — the gate API · `/healthz` — health check

No database, no secrets, no member data. It's the same zero-dependency gate that passes 193 tests.

## Path A — Render (recommended · web UI · ~2 minutes) · **[founder gate]**
1. Sign in to **render.com** with GitHub.
2. **New ▸ Blueprint** → pick repo **`bobrapp/Aigovops-Foundation-Open-Source-V4-10k`**,
   branch **`main`** → Render reads [`render.yaml`](render.yaml) at the root → **Apply**.
3. Render builds the Dockerfile in its cloud and assigns a URL like
   `https://aigovops-studio.onrender.com`.
4. Share that URL with Ken. (Free plan spins down when idle — first hit takes ~30–60s to wake.)

## Path B — Fly.io (CLI) · **[founder gate]**
```bash
brew install flyctl        # if needed
fly auth login             # opens the browser — your account
fly launch --copy-config --no-deploy    # reads ./fly.toml
fly deploy                 # builds Dockerfile in Fly's builder → https://aigovops-studio.fly.dev
```

## The founder gates (why I can't finish this for you)
Everything above the deploy button is staged; the last steps are irreversible and yours:
- **Connecting / creating the Render or Fly account** (creating accounts is a human-only step).
- **Clicking Apply / `fly deploy`** — this stands up a **public** service on the internet.
- Deploying is done from **`main`** (already on GitHub). To deploy this `revive` branch instead,
  it must be pushed first — also a founder gate. The Studio code is identical on both; the branch
  only adds docs, the receipt schema, and the README honesty pass.

## After the demo (tear-down)
- **Render:** dashboard → the service → Settings → **Delete**.
- **Fly:** `fly apps destroy aigovops-studio`.

## Safety note
This is a **public demo with no authentication** — anyone with the URL can use the wizard. It holds
no secrets and no member data, and nothing here touches the Foundation's production systems. Don't
enter real personal data, and tear it down when you're done showing Ken.
