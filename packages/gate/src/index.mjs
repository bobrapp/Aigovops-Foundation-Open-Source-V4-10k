// THE UNIFIED YES-GATE — the single decision path, replacing the three divergent
// gates (Library, Omni, V4). One module every effector calls, in or out of process.
//
//   decide(proposal):
//     1. Umbrella.compile(policy).evaluate(payload)   → criteria          (Get to YES)
//     2. Lantern.detectDrift(baseline, current)       → drift/escalation  (Stay at YES)
//     3. human decision (only if irreversible)        → approve | deny    (humans hold keys)
//     4. Caps.check(actor, cost)                       → hard ceiling      (pause, don't push)
//     5. Beacon.sign(decision)                         → receipt           (proof; deny too)
//     6. on approve → Secrets.issue(scope, ttl)        → brokered grant    (never a raw secret)
//
// Reversible actions need no human gate and no credential. The deny path fails closed.
import { compilePolicy } from "../../umbrella/src/index.mjs";
import { detectDrift } from "../../lantern/src/index.mjs";
import { signEvidence } from "../../beacon/src/index.mjs";

/**
 * @param {Object} p
 *   Criteria (Umbrella):   p.policy | p.profile, p.payload
 *   Drift (Lantern, opt):  p.baseline, p.current, p.tolerance
 *   Human gate:            p.irreversible=false, p.decision ('approve'|'deny')
 *   Caps (opt):            p.caps (Caps instance), p.requestedBy, p.cost {requiredLevel,spend,blastRadius}
 *   Broker (opt):          p.secrets (SecretsProvider), p.scope, p.ttlSeconds
 *   Signing:               p.beacon {privateKey,publicKey}, p.at
 */
export function decide(p = {}) {
  const requestedBy = p.requestedBy || "gate";

  // 1) Criteria — Umbrella.
  const umbrella = compilePolicy({ policy: p.policy, profile: p.profile, payload: p.payload });
  const gates = [umbrella];

  // 2) Drift — Lantern (only when a baseline is supplied).
  let lantern = null;
  if (p.baseline !== undefined) {
    lantern = detectDrift({ baseline: p.baseline, current: p.current, tolerance: p.tolerance });
    gates.push(lantern);
  }

  // Pre-gates must pass before we even consider approving. No receipt on a criteria/drift fail.
  if (!gates.every((g) => g.status === "PASS")) {
    return { status: "FAIL", approved: false, reason: "criteria", gates, mitigation: gates.flatMap((g) => g.mitigation) };
  }

  // 3) Human decision — reversible actions auto-approve; irreversible ones require an explicit 'approve'.
  const effective = p.irreversible ? p.decision : "approve";
  if (effective !== "approve") {
    const receipt = sign(p, requestedBy, { decision: "deny", reason: effective === "deny" ? "denied" : "awaiting-approval" });
    return { status: "FAIL", approved: false, reason: effective === "deny" ? "denied" : "awaiting-approval", gates, ...receipt };
  }

  // 4) Caps — checked AFTER approval, BEFORE brokering. The agent pauses at the cap.
  if (p.caps) {
    const cap = p.caps.check(requestedBy, p.cost || {});
    if (!cap.ok) {
      const receipt = sign(p, requestedBy, { decision: "cap-breach", reason: cap.reason });
      return { status: "FAIL", approved: false, reason: `capped:${cap.reason}`, capped: true, gates, ...receipt };
    }
  }

  // 5) Sign the approving decision as evidence.
  const beacon = signEvidence({
    configured: true,
    payload: { decision: "approve", umbrella: umbrella.policy, lantern: lantern ? "no-drift" : null, scope: p.scope ?? null, at: p.at ?? null },
    privateKey: p.beacon?.privateKey,
    publicKey: p.beacon?.publicKey,
    issuedAt: p.at,
  });
  gates.push({ gate: "beacon", status: "PASS" });

  // 6) Broker a scoped, expiring grant (never the raw secret). Then record usage.
  let grant = null;
  if (p.secrets && p.scope) {
    grant = p.secrets.issue(p.scope, p.ttlSeconds, requestedBy, { parent: beacon.receipt?.evidenceHash });
  }
  if (p.caps) p.caps.record(requestedBy, p.cost || {});

  return { status: "PASS", approved: true, reason: null, gates, receipt: beacon.receipt, publicKey: beacon.publicKey, grant };
}

// Sign a non-approve decision (deny / cap-breach) when a key is available — a deny is as auditable as an approve.
function sign(p, requestedBy, { decision, reason }) {
  const out = signEvidence({
    configured: true,
    payload: { decision, reason, actor: requestedBy, at: p.at ?? null },
    privateKey: p.beacon?.privateKey,
    publicKey: p.beacon?.publicKey,
    issuedAt: p.at,
  });
  return { receipt: out.receipt, publicKey: out.publicKey };
}

// Demo: a reversible action that passes criteria, is signed, and brokers a grant.
if (import.meta.url === `file://${process.argv[1]}`) {
  const out = decide({
    profile: "baseline",
    payload: { model: "claude-opus-4-8", humanApproved: true },
    baseline: { cost: 100 }, current: { cost: 102 }, tolerance: 0.05,
  });
  console.log(JSON.stringify({ status: out.status, gates: out.gates.map((g) => g.gate), hasReceipt: !!out.receipt }, null, 2));
}
