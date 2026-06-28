// M13 — deploy-descriptor generators. Emit the config each 1-click cloud target expects, from
// the same Dockerfile/health contract. `aigovops deploy <target>` prints or writes it.
import { toYaml } from "./compose.mjs";

const PORT = 8930;

/** Render.com blueprint (render.yaml). */
export function renderYaml({ name = "aigovops", port = PORT } = {}) {
  return "# render.yaml — deploy AiGovOps on Render (1-click blueprint).\n" + toYaml({
    services: [{
      type: "web", name, runtime: "docker", dockerfilePath: "./Dockerfile", plan: "starter",
      healthCheckPath: "/healthz",
      envVars: [{ key: "PORT", value: String(port) }, { key: "AIGOVOPS_TIER", value: "4" }],
    }],
  }) + "\n";
}

/** Fly.io app config (fly.toml). */
export function flyToml({ app = "aigovops", port = PORT } = {}) {
  return [
    `app = "${app}"`, `primary_region = "iad"`, "",
    "[build]", `  dockerfile = "Dockerfile"`, "",
    "[http_service]", `  internal_port = ${port}`, "  force_https = true",
    "  auto_stop_machines = true", "  auto_start_machines = true", "  min_machines_running = 1", "",
    "[[http_service.checks]]", `  path = "/healthz"`, "  interval = \"30s\"", "  timeout = \"3s\"", "",
  ].join("\n");
}

/** DigitalOcean App Platform spec (.do/app.yaml). */
export function doAppSpec({ name = "aigovops", port = PORT } = {}) {
  return "# .do/app.yaml — DigitalOcean App Platform.\n" + toYaml({
    name,
    services: [{
      name: "gate", dockerfile_path: "Dockerfile", http_port: port,
      instance_size_slug: "basic-xxs", instance_count: 1,
      health_check: { http_path: "/healthz" },
      envs: [{ key: "PORT", value: String(port) }, { key: "AIGOVOPS_TIER", value: "4" }],
    }],
  }) + "\n";
}

/** cloud-init user-data — bootstraps a bare VPS / DigitalOcean droplet to a running install. */
export function cloudInit() {
  return [
    "#cloud-config",
    "package_update: true",
    "packages: [docker.io, git, nodejs, npm, caddy]",
    "runcmd:",
    "  - systemctl enable --now docker",
    "  - curl -fsSL https://get.aigovops.org | sh",
  ].join("\n") + "\n";
}

const TARGETS = {
  render: { filename: "render.yaml", gen: renderYaml },
  fly: { filename: "fly.toml", gen: flyToml },
  do: { filename: ".do/app.yaml", gen: doAppSpec },
  "cloud-init": { filename: "cloud-init.yaml", gen: cloudInit },
};

export function deployFor(target, opts = {}) {
  const t = TARGETS[target] || (target === "vps" ? TARGETS["cloud-init"] : null);
  if (!t) throw new Error(`unknown target "${target}" — one of: ${Object.keys(TARGETS).join(", ")}`);
  return { filename: t.filename, content: t.gen(opts) };
}

export const DEPLOY_TARGETS = Object.keys(TARGETS);
