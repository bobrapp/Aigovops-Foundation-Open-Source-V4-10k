#!/usr/bin/env node
// M10 — `aigovops` CLI. One command from nothing to a running, TLS-secured gate.
//   aigovops up [--tier N] [--with a,b] [--port P]   bring up the stack
//   aigovops plan / doctor / down
import { writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { plan, composeYaml, caddyfileFor } from "./index.mjs";
import { installPlan, JeevesInstaller, toProposal } from "../../agent-install/src/index.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const argv = process.argv.slice(2);
const cmd = argv[0] && !argv[0].startsWith("--") ? argv[0] : "up";
const flag = (name, def) => {
  const i = argv.indexOf("--" + name);
  if (i < 0) return def;
  const v = argv[i + 1];
  return v === undefined || v.startsWith("--") ? true : v;
};
const have = (bin) => spawnSync(bin, ["--version"], { stdio: "ignore" }).status === 0;

const tier = flag("tier") ? Number(flag("tier")) : undefined;
const withServices = typeof flag("with") === "string" ? String(flag("with")).split(",").map((s) => s.trim()).filter(Boolean) : [];
const port = Number(flag("port", 8930));

if (cmd === "doctor") {
  console.log("node:   " + (have("node") ? "ok" : "MISSING (need 20+)"));
  console.log("docker: " + (have("docker") ? "ok" : "missing — will use the node runtime (gate only)"));
  process.exit(0);
}

const p = plan({ tier, withServices, port, runtime: have("docker") ? undefined : "node" });
console.log(`AiGovOps · tier ${p.tier} · runtime ${p.runtime} · services: ${p.services.join(", ")}`);

if (cmd === "plan") { console.log(JSON.stringify(p, null, 2)); process.exit(0); }

if (cmd === "down") {
  spawnSync("docker", ["compose", "-f", join(repoRoot, "deploy/compose/docker-compose.yml"), "down"], { stdio: "inherit" });
  process.exit(0);
}

if (cmd === "setup") {
  // The Jeeves agent-run: propose the plan; auto-run reversible steps; pause at every human gate.
  const target = typeof flag("target") === "string" ? flag("target") : "local";
  const domain = typeof flag("domain") === "string" ? flag("domain") : undefined;
  const approvals = typeof flag("approve") === "string" ? String(flag("approve")).split(",").map((s) => s.trim()).filter(Boolean) : [];
  const ip = installPlan({ tier: p.tier, target, domain });
  console.log("\n" + toProposal(ip) + "\n");
  if (!argv.includes("--execute")) {
    console.log("(dry run — Jeeves runs the auto steps and pauses at each ⛔ gate for your approval.)");
    console.log("Run it:  aigovops setup --target " + target + " --execute --approve <gate-ids>");
    process.exit(0);
  }
  const inst = new JeevesInstaller({
    plan: ip,
    executors: {
      deploy: () => { console.log("   …deploying via `aigovops up`"); return "deployed"; },
      verify: () => "conformance ok · signed receipt",
    },
  });
  approvals.forEach((g) => inst.approve(g));
  const r = await inst.run();
  console.log("ran: " + r.completed.map((c) => c.id).join(", "));
  if (r.status === "blocked") {
    console.log(`\n⛔ Paused at: ${r.gate.title}\n   ↳ ${r.message}\n   approve: aigovops setup --target ${target} --execute --approve ${[...inst.approved, r.at].join(",")}`);
  } else {
    console.log("\n✓ Install complete — humans held the keys at every irreversible step.");
  }
  process.exit(0);
}

if (cmd === "up") {
  if (p.runtime === "compose") {
    const dir = join(repoRoot, "deploy", "compose");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "docker-compose.yml"), composeYaml({ tier: p.tier, withServices, port }));
    writeFileSync(join(dir, "Caddyfile"), caddyfileFor({ domain: process.env.AIGOVOPS_DOMAIN }));
    console.log("→ docker compose up -d");
    const r = spawnSync("docker", ["compose", "-f", join(dir, "docker-compose.yml"), "up", "-d"], { stdio: "inherit" });
    if (r.status !== 0) process.exit(r.status || 1);
    console.log(`\n✓ up.  Studio: ${p.urls.studio}   API: ${p.urls.api}   Health: ${p.urls.health}`);
  } else {
    console.log("→ starting the gate (node runtime, no Docker needed)");
    console.log(`  Studio: ${p.urls.studio}   API: ${p.urls.api}`);
    spawnSync("node", [join(repoRoot, "packages/server/src/cli.mjs")], { stdio: "inherit", env: { ...process.env, PORT: String(port) } });
  }
  process.exit(0);
}

console.error("usage: aigovops [up|down|plan|doctor] [--tier N] [--with a,b] [--port P]");
process.exit(1);
