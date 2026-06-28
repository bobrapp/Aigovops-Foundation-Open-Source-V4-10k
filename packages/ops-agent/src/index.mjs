// M19 — the Ops agent. Jeeves manages it; it drives the remaining ops milestones (the work that
// is NOT product: publishing the image, standing up observability, provisioning, deploying, building
// the desktop installers, wiring live Stripe, publishing to npm, DNS, go-live).
//
// Same discipline as the M12 installer: every step is `auto` (reversible — the agent does it) or
// `gate` (irreversible / outward — a human must approve: change visibility, provision a host, enter
// credentials, change DNS, flip the switch). The runner executes auto steps and STOPS at the first
// unapproved gate, returning exactly what the human must do. Agents do the bureaucracy; humans hold
// the keys.

/**
 * Build the ordered ops plan from what the operator wants to ship.
 * @param {{registryPublic?:boolean, host?:"none"|"vps"|"cloud", domain?:string, desktop?:boolean, saas?:boolean, npm?:boolean}} [opts]
 * @returns {{steps: Array<{id,title,kind:"auto"|"gate",milestone,detail,humanAction}>}}
 */
export function opsPlan({ registryPublic = true, host = "none", domain = null, desktop = false, saas = false, npm = false } = {}) {
  const steps = [];
  const add = (id, title, kind, milestone, detail, humanAction = null) => steps.push({ id, title, kind, milestone, detail, humanAction });

  if (registryPublic) {
    add("registry-public", "Publish the image to the world", "gate", "release",
      "The GHCR package defaults to private — only the owner can pull it.",
      "Set the GHCR `aigovops` package visibility to Public (Settings → Packages → aigovops → Change visibility). This is an access-control change — yours to make.");
  }

  add("observability", "Stand up observability", "auto", "M14/M17",
    "Generate the Prometheus + Grafana + Jaeger + OTel-Collector compose, import deploy/console/grafana-dashboard.json, and point the gate's OTLP exporter at the collector.");

  if (host === "vps" || host === "cloud") {
    add("provision", "Provision the host", "gate", "ops",
      "A server must exist to deploy onto.",
      `Confirm/create the ${host} host — the agent opens the exact console page and prefills it; paste back the host address.`);
    add("deploy", "Deploy the stack", "auto", "M10/M13",
      "Render the tier compose/Helm, deploy the gate + Caddy (auto-HTTPS) + backends, and health-check /healthz on every service.");
  }

  if (desktop) {
    add("desktop-build", "Build the desktop installers", "auto", "M13",
      "Run the Tauri build (requires the Rust toolchain) to produce the macOS/Windows/Linux bundles.");
    add("desktop-sign", "Sign & notarize the installers", "gate", "M13",
      "Distributable installers must be code-signed.",
      "Provide the Apple notarization / Windows code-signing credentials to the broker — the agent never holds signing keys.");
  }

  if (saas) {
    add("stripe-live", "Connect live billing", "gate", "M15",
      "Charging real money needs a real, owned Stripe account.",
      "Create/connect the Stripe account and add the live key to the secrets broker (`jeeves add stripe`). The agent wires it; you own the account.");
  }

  if (npm) {
    add("npm-token", "Authorize npm publishing", "gate", "M17",
      "Publishing to the public npm registry needs a write token.",
      "Add an npm automation token to the repo's Actions secrets as NPM_TOKEN.");
    add("npm-publish", "Publish the packages", "auto", "M17",
      "Publish the @aigovops/* workspaces to npm (gated on NPM_TOKEN being present).");
  }

  if (domain) {
    add("dns", "Point the domain", "gate", "ops",
      "Public access needs DNS.",
      `Add the A record for ${domain} — the agent shows the exact values; confirm when it resolves.`);
  }

  add("golive", "Go live", "gate", "ops",
    "The final, irreversible switch.",
    "Approve go-live. The agent has prepared everything reversible; you make the irreversible move.");

  return { steps };
}

export class OpsAgent {
  /** @param {{plan, executors?:Object<string,Function>}} args  executors[stepId](step) runs an auto step */
  constructor({ plan, executors = {} } = {}) {
    this.plan = plan;
    this.executors = executors;
    this.approved = new Set();
    this.completed = [];
    this.cursor = 0;
  }

  /** A human approves one irreversible gate. */
  approve(gateId) { this.approved.add(gateId); return this; }

  get pending() { return this.plan.steps[this.cursor] || null; }
  get gates() { return this.plan.steps.filter((s) => s.kind === "gate"); }
  get progress() { return { done: this.completed.length, total: this.plan.steps.length }; }

  /** Run auto steps until done or blocked at an unapproved gate. */
  async run() {
    while (this.cursor < this.plan.steps.length) {
      const s = this.plan.steps[this.cursor];
      if (s.kind === "gate" && !this.approved.has(s.id)) {
        return { status: "blocked", at: s.id, gate: s, message: s.humanAction, completed: this.completed.slice() };
      }
      const exec = this.executors[s.id];
      let result = null, error = null;
      try { result = exec ? await exec(s) : { noted: "no executor wired — recorded as planned" }; }
      catch (e) { error = String(e?.message || e); }
      this.completed.push({ id: s.id, kind: s.kind, milestone: s.milestone, result, error });
      this.cursor++;
    }
    return { status: "complete", completed: this.completed.slice() };
  }
}

/** Human-readable proposal: what the agent will do, and exactly where you decide. */
export function toProposal(plan) {
  const gates = plan.steps.filter((s) => s.kind === "gate").length;
  const lines = [`Ops plan — ${plan.steps.length} steps, ${gates} human gate${gates === 1 ? "" : "s"}`, ""];
  plan.steps.forEach((s, i) => {
    const tag = s.kind === "gate" ? "⛔ HUMAN GATE" : "✓ auto";
    lines.push(`${i + 1}. [${tag}] ${s.title} (${s.milestone}) — ${s.detail}`);
    if (s.humanAction) lines.push(`     ↳ you: ${s.humanAction}`);
  });
  return lines.join("\n");
}
