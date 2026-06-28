#!/usr/bin/env node
// `aigovops-ops [--host vps|cloud] [--domain d] [--desktop] [--saas] [--npm] [--approve id,id]`
// Prints the plan, then runs the reversible steps and stops at the first unapproved human gate.
import { opsPlan, OpsAgent, toProposal } from "./index.mjs";

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const val = (name, d) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : d; };

const plan = opsPlan({
  host: val("host", "none"),
  domain: val("domain", null),
  desktop: flag("desktop"),
  saas: flag("saas"),
  npm: flag("npm"),
});

console.log(toProposal(plan));
console.log("\n— running reversible work —\n");

const agent = new OpsAgent({ plan });
(val("approve", "") || "").split(",").filter(Boolean).forEach((id) => agent.approve(id.trim()));

const out = await agent.run();
if (out.status === "blocked") {
  console.log(`⛔ Stopped at "${out.at}" — this one is yours to make.`);
  console.log(`   ${out.message}`);
  console.log(`\n   When done, re-run with --approve ${out.at} (comma-separate to approve several).`);
} else {
  console.log("✓ All steps complete.");
}
