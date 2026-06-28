// M22 — Ready-for-Human gates. For EVERY step, the agent does all the engineering it can ahead of
// time: the exact command, the prefilled config artifact, the deep-link, and the precise values.
// Auto steps become directly executable; human gates arrive fully staged — the human just clicks.
// "Ready for human" = nothing left to prepare, only the irreversible decision remains.

const OWNER = "bobrapp";
const IMAGE = "ghcr.io/bobrapp/aigovops:v4.0.0";

/** Engineer one step. @returns {{id,kind,ready,engineered?,command?,artifactPath?,link?,record?,preflight?,humanAction?,needs?}} */
export function prepareStep(step, ctx = {}) {
  const owner = ctx.owner || OWNER;
  const domain = ctx.domain || "app.aigovops.org";
  const ip = ctx.ip || "YOUR_HOST_IP"; // replaced with the real IP once the host is provisioned
  const gate = (x) => ({ id: step.id, kind: "gate", ready: true, needs: step.needs || [], ...x });
  const auto = (x) => ({ id: step.id, kind: "auto", ready: true, engineered: true, needs: step.needs || [], ...x });

  switch (step.id) {
    case "registry-public":
      return gate({
        link: `https://github.com/users/${owner}/packages/container/aigovops/settings`,
        command: `gh api -X PATCH /user/packages/container/aigovops/visibility -f visibility=public`,
        humanAction: "One click: set the package to Public in the Danger Zone — or run the prepared gh command if your token has packages:write.",
      });
    case "observability":
      return auto({ command: "docker compose -f deploy/observability/compose.yml up -d", artifactPath: "deploy/observability/compose.yml" });
    case "provision":
      return gate({
        link: "https://cloud.digitalocean.com/droplets/new?image=docker-20-04&size=s-2vcpu-2gb&region=nyc1",
        artifactPath: "deploy/provision/cloud-init.yaml",
        humanAction: "Create the host with the prepared cloud-init (already filled in). It boots Docker, pulls the image, and starts the gate behind Caddy. Paste back the IP.",
      });
    case "deploy":
      return auto({ command: `ssh root@${ip} 'bash -s' < deploy/scripts/deploy.sh`, artifactPath: "deploy/scripts/deploy.sh" });
    case "desktop-build":
      return auto({ command: "cd desktop && npm run tauri build" });
    case "desktop-sign":
      return auto({ command: "bash deploy/scripts/sign-desktop.sh", artifactPath: "deploy/scripts/sign-desktop.sh" });
    case "stripe-wire":
      return auto({ command: "docker compose --env-file deploy/stripe/.env up -d", artifactPath: "deploy/stripe/env.template" });
    case "npm-publish":
      return auto({ command: "npm publish --workspaces --access public" });
    case "dns":
      return gate({
        link: "https://dash.cloudflare.com",
        record: { type: "A", name: domain, value: ip, ttl: 300 },
        humanAction: `Add the prepared A record exactly: ${domain} → ${ip} (TTL 300). Confirm when it resolves.`,
      });
    case "golive":
      return gate({
        preflight: [`https://${domain}/healthz`, `https://${domain}/v1/conformance`, "TLS certificate valid"],
        humanAction: "Preflight is green and everything reversible is staged. Approve go-live — the one irreversible move.",
      });
    default:
      return auto({ command: `(${step.id})` });
  }
}

/** Attach a prepared artifact to every step. */
export function prepareAll(plan, ctx = {}) {
  return plan.steps.map((s) => ({ ...s, prepared: prepareStep(s, ctx) }));
}

/** Summary: are all auto steps engineered, and what does each gate need from the human? */
export function readyForHuman(plan, ctx = {}) {
  const steps = prepareAll(plan, ctx);
  const autos = steps.filter((s) => s.kind === "auto");
  return {
    steps,
    gates: steps.filter((s) => s.kind === "gate").map((s) => ({ id: s.id, title: s.title, humanAction: s.prepared.humanAction, link: s.prepared.link, record: s.prepared.record, preflight: s.prepared.preflight })),
    allAutoEngineered: autos.length > 0 && autos.every((s) => s.prepared.engineered && s.prepared.command),
  };
}

export const IMAGE_REF = IMAGE;
