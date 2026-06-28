// Jeeves as agent manager AND site manager.
//
// Agent manager: a registry of sub-agents (the blueprint's three tiers) and a router that
// picks the right one for a request. Site manager: a single status() over the whole estate —
// tier, registered agents, and a role-aware ledger summary. Jeeves coordinates; humans decide.
import { converse } from "./converse.mjs";
import { improve } from "../../packages/policy-improver/src/index.mjs";
import { authorPolicy } from "../../packages/gate-author/src/index.mjs";
import { detectDrift } from "../../packages/lantern/src/index.mjs";
import { opsPlan, toProposal as opsProposal } from "../../packages/ops-agent/src/index.mjs";

// The sub-agent registry — id, tier, trigger keywords, and what each does.
export const JEEVES_AGENTS = [
  { id: "policy-improver", tier: 2, match: ["policy", "improve", "regulation", "comply", "gap"], describe: "written policy → cited gap analysis" },
  { id: "gate-author", tier: 2, match: ["gate", "criteria", "exit state", "encode", "rule"], describe: "gaps → runnable gates + exit states" },
  { id: "drift-monitor", tier: 1, match: ["drift", "monitor", "baseline", "changed", "regress"], describe: "baseline vs current → drift + escalation" },
  { id: "compliance-attestor", tier: 1, match: ["attest", "evidence", "bundle", "audit", "receipt"], describe: "assemble a signed evidence bundle" },
  { id: "regulation-watch", tier: 1, match: ["watch", "update", "new law", "change in law"], describe: "scan regulation feeds for changes" },
  { id: "ops-runner", tier: 1, match: ["ops", "deploy", "provision", "release", "publish", "go live", "golive", "desktop", "stripe", "install", "host"], describe: "drive the remaining ops milestones, auto-running the reversible work and pausing at every human gate" },
];

/** Pick the sub-agent whose trigger words best match the request. Defaults to policy-improver. */
export function route(utterance) {
  const t = String(utterance).toLowerCase();
  let best = null, score = 0;
  for (const a of JEEVES_AGENTS) {
    const s = a.match.filter((w) => t.includes(w)).length;
    if (s > score) { score = s; best = a; }
  }
  return (best || JEEVES_AGENTS[0]).id;
}

export class Jeeves {
  constructor({ llm, ledger } = {}) { this.llm = llm; this.ledger = ledger; }

  /** Conversational policy improvement (the LLM-fronted wedge). */
  async converse(utterance) { return converse(utterance, { llm: this.llm }); }

  /** Route a request and run the matched sub-agent, returning { agent, result }. */
  async manage(utterance, input = {}) {
    const agent = route(utterance);
    let result;
    switch (agent) {
      case "gate-author": result = authorPolicy(improve(input.policyText ?? utterance, input.context || {})); break;
      case "drift-monitor": result = detectDrift(input); break;
      case "ops-runner": {
        const plan = opsPlan(input.ops || {});
        result = { plan, proposal: opsProposal(plan), firstGate: plan.steps.find((s) => s.kind === "gate") || null };
        break;
      }
      default: result = improve(input.policyText ?? utterance, input.context || {}); // policy-improver et al.
    }
    return { agent, result };
  }

  /** Site/estate status — a role-aware view over the whole governed core. */
  status({ tier, role = "steward", actor } = {}) {
    const records = this.ledger?.records || [];
    const visible = role === "steward" || role === "auditor" || role === "developer"
      ? records
      : records.filter((r) => r.actor === actor);
    const byStatus = visible.reduce((m, r) => ((m[r.status] = (m[r.status] || 0) + 1), m), {});
    return {
      tier: tier ?? null,
      role,
      killed: this.ledger?.killed ?? false,
      agents: JEEVES_AGENTS.map((a) => ({ id: a.id, tier: a.tier })),
      ledger: { visible: visible.length, byStatus },
    };
  }
}
