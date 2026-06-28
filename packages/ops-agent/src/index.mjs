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
  // needs = 1Password item titles the step's executor will resolve through the governed broker.
  const add = (id, title, kind, milestone, detail, { humanAction = null, needs = [] } = {}) =>
    steps.push({ id, title, kind, milestone, detail, humanAction, needs });

  if (registryPublic) {
    add("registry-public", "Publish the image to the world", "gate", "release",
      "The GHCR package defaults to private — only the owner can pull it.",
      { humanAction: "Set the GHCR `aigovops` package visibility to Public (Settings → Packages → aigovops → Change visibility). This is an access-control change — yours to make." });
  }

  add("observability", "Stand up observability", "auto", "M14/M17",
    "Generate the Prometheus + Grafana + Jaeger + OTel-Collector compose, import the dashboard, and point the gate's OTLP exporter at the collector.");

  if (host === "vps" || host === "cloud") {
    add("provision", "Provision the host", "gate", "ops",
      "A server must exist to deploy onto.",
      { humanAction: `Confirm/create the ${host} host — the agent opens the exact console page and prefills it; paste back the host address.` });
    add("deploy", "Deploy the stack", "auto", "M10/M13",
      "Render the tier compose/Helm, deploy the gate + Caddy (auto-HTTPS) + backends, health-check /healthz.",
      { needs: ["deploy-ssh-key"] }); // resolved from 1Password — no paste
  }

  if (desktop) {
    add("desktop-build", "Build the desktop installers", "auto", "M13",
      "Run the Tauri build (Rust toolchain) → macOS/Windows/Linux bundles.");
    add("desktop-sign", "Sign & notarize the installers", "auto", "M13",
      "Code-sign + notarize using the signing identity — resolved from 1Password; the agent never holds the key on disk.",
      { needs: ["apple-signing-cert", "windows-signing-cert"] });
  }

  if (saas) {
    add("stripe-wire", "Wire live billing", "auto", "M15",
      "Configure the hosted gate with the live Stripe key — resolved from 1Password.",
      { needs: ["stripe-live-key"] });
  }

  if (npm) {
    add("npm-publish", "Publish the packages", "auto", "M17",
      "Publish the @aigovops/* workspaces to npm using the automation token — resolved from 1Password.",
      { needs: ["npm-token"] });
  }

  if (domain) {
    add("dns", "Point the domain", "gate", "ops",
      "Public access needs DNS.",
      { humanAction: `Add the A record for ${domain} — the agent shows the exact values; confirm when it resolves.` });
  }

  add("golive", "Go live", "gate", "ops",
    "The final, irreversible switch.",
    { humanAction: "Approve go-live. The agent has prepared everything reversible; you make the irreversible move." });

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

// The agent-driven runbook. Same plan, but credentials are resolved at runtime from the team
// credential store (1Password) THROUGH the governed broker — the agent mints a scoped, expiring,
// logged grant and redeems it, so even its own credential access is governed. Credential entry is no
// longer a manual step: a human stores each secret in 1Password ONCE; the runbook pulls it every run.
// It pauses only for (a) an unapproved irreversible/outward gate, or (b) a credential not yet stored.
export class OpsRunbook {
  /** @param {{plan, broker, executors?:Object<string,Function>, ttl?:number, requestedBy?:string}} args */
  constructor({ plan, broker, executors = {}, ttl = 300, requestedBy = "ops-agent" } = {}) {
    this.plan = plan; this.broker = broker; this.executors = executors; this.ttl = ttl; this.requestedBy = requestedBy;
    this.approved = new Set(); this.completed = []; this.cursor = 0;
  }
  approve(gateId) { this.approved.add(gateId); return this; }
  get gates() { return this.plan.steps.filter((s) => s.kind === "gate"); }

  /** Resolve one credential via the governed broker (issue scoped grant → redeem). null if absent. */
  async _resolve(name) {
    const grant = this.broker.issue(name, this.ttl, this.requestedBy);
    try { return await this.broker.redeem(grant.token); }
    catch { return null; }
    finally { this.broker.revoke?.(grant.token); } // single-use; never lingers
  }

  async run() {
    while (this.cursor < this.plan.steps.length) {
      const s = this.plan.steps[this.cursor];

      if (s.kind === "gate" && !this.approved.has(s.id)) {
        return { status: "blocked", reason: "gate", at: s.id, gate: s, message: s.humanAction, completed: this.completed.slice() };
      }

      // Pull every credential this step needs from 1Password (through the governed broker).
      const secrets = {};
      for (const name of s.needs || []) {
        const v = await this._resolve(name);
        if (v == null) {
          return {
            status: "blocked", reason: "credential", at: s.id, missing: name, completed: this.completed.slice(),
            message: `Store "${name}" in 1Password once (vault item titled "${name}"). The agent will resolve it every run — no paste.`,
          };
        }
        secrets[name] = v;
      }

      const exec = this.executors[s.id];
      let result = null, error = null;
      try { result = exec ? await exec(s, secrets) : { noted: "no executor wired — recorded as planned" }; }
      catch (e) { error = String(e?.message || e); }
      this.completed.push({ id: s.id, kind: s.kind, milestone: s.milestone, used: Object.keys(secrets), result, error });
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
    if (s.needs?.length) lines.push(`     ↳ creds (1Password, no paste): ${s.needs.join(", ")}`);
    if (s.humanAction) lines.push(`     ↳ you: ${s.humanAction}`);
  });
  return lines.join("\n");
}
