// M10 — `aigovops up` planning logic. Pure and testable; the imperative shell is in cli.mjs.
import { detectTier } from "../../install/src/index.mjs";
import { servicesFor } from "./compose.mjs";

export { composeFor, composeYaml, caddyfileFor, servicesFor, toYaml } from "./compose.mjs";

/** 'compose' (full stack, needs Docker) or 'node' (the gate alone, zero-install). */
export function detectRuntime(env = process.env) {
  return env.AIGOVOPS_RUNTIME || "compose";
}

export function urlsFor({ port = 8930, withCaddy = false, domain } = {}) {
  const base = withCaddy ? (domain ? `https://${domain}` : "http://localhost") : `http://localhost:${port}`;
  return { studio: `${base}/`, api: `${base}/v1`, health: `${base}/healthz` };
}

/** Describe exactly what `aigovops up` will do — no side effects. */
export function plan({ tier, withServices = [], port = 8930, runtime, domain, env = process.env } = {}) {
  const t = tier || detectTier(env).tier;
  const extras = servicesFor({ tier: t, withServices });
  const rt = runtime || detectRuntime(env);
  const withCaddy = extras.length > 0;
  return {
    tier: t,
    runtime: rt,
    services: ["gate", ...(withCaddy ? ["caddy"] : []), ...extras],
    urls: urlsFor({ port, withCaddy, domain }),
    steps:
      rt === "compose"
        ? ["write docker-compose.yml + Caddyfile", "docker compose up -d", "wait for /healthz", "print URLs"]
        : ["node packages/server/src/cli.mjs", "wait for /healthz", "print URLs"],
  };
}
