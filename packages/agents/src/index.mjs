export { watch, snapshot } from "./regulation-watch.mjs";
export { attest } from "./compliance-attestor.mjs";
export { bundle } from "./audit-bundler.mjs";

// The Tier-1 autonomous schedule (cron in UTC). These feed the scheduler and the
// Airflow / GitHub-Actions exporters in @aigovops/scheduler.
export const TIER1_JOBS = [
  { name: "regulation-watch", cron: "0 6 * * 1", describe: "Mondays 06:00 — diff the regulatory corpus" },
  { name: "compliance-attestor", cron: "0 7 * * 1", describe: "Mondays 07:00 — sign the weekly evidence bundle" },
  { name: "audit-bundler", cron: "0 6 * * *", describe: "Daily 06:00 — assemble the auditor report" },
];
