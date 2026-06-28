import { signEvidence, verifyReceipt } from "../../packages/beacon/src/index.mjs";
import { detectDrift } from "../../packages/lantern/src/index.mjs";
import { compilePolicy } from "../../packages/umbrella/src/index.mjs";

export { verifyReceipt } from "../../packages/beacon/src/index.mjs";

// Jeeves — the manager-agent. Runs the governance pipeline end to end:
//   1. Umbrella  — does the request satisfy policy?
//   2. Lantern   — has the system drifted from its baseline?
//   3. Beacon    — if both pass, sign a verifiable evidence receipt of the verdict.
// Agents do the bureaucracy; humans hold the keys.
export function orchestrate(input = {}) {
  const umbrella = compilePolicy(input.umbrella);
  const lantern = detectDrift(input.lantern);
  const gates = [umbrella, lantern];

  if (!gates.every((g) => g.status === "PASS")) {
    return { status: "FAIL", gates, mitigation: gates.flatMap((g) => g.mitigation) };
  }

  // Both gates pass → Beacon signs the orchestration as proof.
  const beacon = signEvidence({
    configured: true,
    payload: { umbrella: umbrella.policy, lantern: "no-drift", at: input.at ?? null },
    privateKey: input.beacon?.privateKey,
    publicKey: input.beacon?.publicKey,
    issuedAt: input.at,
  });

  return { status: "PASS", gates: [...gates, beacon], receipt: beacon.receipt, publicKey: beacon.publicKey };
}

// Demo when run directly: a clean pass that produces a verifiable receipt.
if (import.meta.url === `file://${process.argv[1]}`) {
  const out = orchestrate({
    umbrella: { profile: "baseline", payload: { model: "claude-opus-4-8", humanApproved: true } },
    lantern: { baseline: { cost: 100 }, current: { cost: 102 }, tolerance: 0.05 },
  });
  out.verified = out.receipt ? verifyReceipt(out.receipt, out.publicKey) : false;
  console.log(JSON.stringify(out, null, 2));
}
