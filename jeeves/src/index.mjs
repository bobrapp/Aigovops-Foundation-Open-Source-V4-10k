import { decide } from "../../packages/gate/src/index.mjs";

export { verifyReceipt } from "../../packages/beacon/src/index.mjs";
export { HeuristicLLM, AnthropicLLM } from "./llm.mjs";
export { converse } from "./converse.mjs";
export { Jeeves, JEEVES_AGENTS, route } from "./manager.mjs";

// Jeeves — the manager-agent. As of M0 it delegates to the ONE unified gate
// (@aigovops/gate) instead of re-implementing the pipeline. It proposes; the gate
// decides; a human holds the keys. Agents do the bureaucracy.
export function orchestrate(input = {}) {
  return decide({
    // Criteria (Umbrella)
    policy: input.umbrella?.policy,
    profile: input.umbrella?.profile,
    payload: input.umbrella?.payload,
    // Drift (Lantern)
    baseline: input.lantern?.baseline,
    current: input.lantern?.current,
    tolerance: input.lantern?.tolerance,
    // Human gate / caps / broker (all optional — passed straight through)
    irreversible: input.irreversible,
    decision: input.decision,
    caps: input.caps,
    requestedBy: input.requestedBy,
    cost: input.cost,
    secrets: input.secrets,
    scope: input.scope,
    ttlSeconds: input.ttlSeconds,
    // Signing
    beacon: input.beacon,
    at: input.at,
  });
}

// Demo when run directly: a clean pass that produces a verifiable receipt.
if (import.meta.url === `file://${process.argv[1]}`) {
  const out = orchestrate({
    umbrella: { profile: "baseline", payload: { model: "claude-opus-4-8", humanApproved: true } },
    lantern: { baseline: { cost: 100 }, current: { cost: 102 }, tolerance: 0.05 },
  });
  console.log(JSON.stringify({ status: out.status, gates: out.gates.map((g) => g.gate), hasReceipt: !!out.receipt }, null, 2));
}
