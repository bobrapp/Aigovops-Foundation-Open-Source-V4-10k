#!/usr/bin/env node
// Single entry point the schedulers/exporters invoke: `node .../run.mjs <agent-name>`.
import { watch } from "./regulation-watch.mjs";
import { attest } from "./compliance-attestor.mjs";
import { bundle } from "./audit-bundler.mjs";

const name = process.argv[2];
const handlers = {
  "regulation-watch": () => watch({}),
  "compliance-attestor": () => attest({ checks: [{ name: "baseline", profile: "baseline", payload: { model: "claude-opus-4-8", humanApproved: true } }] }),
  "audit-bundler": () => bundle({ records: [] }),
};

const run = handlers[name];
if (!run) {
  console.error(`unknown agent: ${name}. one of: ${Object.keys(handlers).join(", ")}`);
  process.exit(1);
}
console.log(JSON.stringify(run(), null, 2));
