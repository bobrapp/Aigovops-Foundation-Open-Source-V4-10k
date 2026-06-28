// M12 — Jeeves agent-run install.
//
// The whole install as an ordered plan where each step is `auto` (reversible — Jeeves does it)
// or `gate` (irreversible — a human must approve: provision a host, create an account, enter
// credentials, change DNS, go live). The installer runs auto steps and STOPS at the first
// unapproved gate, returning exactly what the human must do. This is the irreversibility boundary
// encoded as a state machine: agents do the bureaucracy; humans hold the keys.

/**
 * @param {{tier?:number, target?:"local"|"vps"|"cloud", domain?:string}} [opts]
 * @returns {{tier, target, domain, steps: Array<{id,title,kind:"auto"|"gate",detail,humanAction}>}}
 */
export function installPlan({ tier = 4, target = "local", domain } = {}) {
  const steps = [];
  const add = (id, title, kind, detail, humanAction = null) => steps.push({ id, title, kind, detail, humanAction });

  add("detect", "Detect environment & tier", "auto", `tier ${tier}, target ${target}`);
  if (target === "cloud" || target === "vps") {
    add("provision", "Provision the host", "gate", "A server must exist to deploy onto.",
      "Confirm/create the host in your cloud console — Jeeves opens the exact page and prefills it; paste the host address.");
    add("account", "Create the steward account", "gate", "First run needs an owner identity.",
      "Approve creating the steward account — the human who holds the keys and the kill switch.");
  }
  add("secrets", "Render secrets from the broker", "auto", "Resolved at deploy time from the SecretsProvider; never displayed.");
  add("deploy", "Deploy the stack", "auto", `gate + Caddy + backends for tier ${tier} (compose/helm)`);
  add("health", "Health-check every service", "auto", "wait for /healthz on each service");
  add("onboard", "Run guided onboarding", "auto", "identity · caps · policy · gates · proof");
  add("verify", "Verify the install", "auto", "conformance suite + a signed, verifiable receipt");
  if (domain) add("dns", "Point your domain", "gate", "Public access needs DNS.",
    `Add the A record for ${domain} — Jeeves shows the exact values; confirm when it resolves.`);
  add("golive", "Go live", "gate", "The final irreversible switch.",
    "Approve go-live. Agents propose; you make the irreversible move.");

  return { tier, target, domain: domain ?? null, steps };
}

export class JeevesInstaller {
  /** @param {{plan, executors?:Object<string,Function>}} args  executors[stepId](step) runs an auto step */
  constructor({ plan, executors = {} } = {}) {
    this.plan = plan;
    this.executors = executors;
    this.approved = new Set();
    this.completed = [];
    this.cursor = 0;
  }

  /** A human approves an irreversible gate. */
  approve(gateId) { this.approved.add(gateId); return this; }

  get pending() { return this.plan.steps[this.cursor] || null; }
  get gates() { return this.plan.steps.filter((s) => s.kind === "gate"); }

  /**
   * Run auto steps until done or blocked at an unapproved gate.
   * @returns {{status:"complete"|"blocked", completed, at?, gate?, message?}}
   */
  async run() {
    while (this.cursor < this.plan.steps.length) {
      const s = this.plan.steps[this.cursor];
      if (s.kind === "gate" && !this.approved.has(s.id)) {
        return { status: "blocked", at: s.id, gate: s, message: s.humanAction, completed: this.completed.slice() };
      }
      const exec = this.executors[s.id];
      const result = exec ? await exec(s) : null;
      this.completed.push({ id: s.id, kind: s.kind, result });
      this.cursor++;
    }
    return { status: "complete", completed: this.completed.slice() };
  }
}

/** Render the plan as a human-readable proposal (what Jeeves will do, and where you decide). */
export function toProposal(plan) {
  const lines = [`AiGovOps install plan — tier ${plan.tier} · target ${plan.target}` + (plan.domain ? ` · ${plan.domain}` : ""), ""];
  plan.steps.forEach((s, i) => {
    const tag = s.kind === "gate" ? "⛔ HUMAN GATE" : "✓ auto";
    lines.push(`${i + 1}. [${tag}] ${s.title} — ${s.detail}`);
    if (s.humanAction) lines.push(`     ↳ you: ${s.humanAction}`);
  });
  return lines.join("\n");
}
