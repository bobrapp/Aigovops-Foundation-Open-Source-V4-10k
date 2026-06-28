// Governed vs. ungoverned — the comparison mode (GAC's core differentiator).
//
// Same request, two worlds:
//   ungoverned — the action just runs. No checks, no record, no recourse.
//   governed   — routed through the unified gate against an authored policy. It either
//                PASSes (allowed + a signed receipt) or FAILs (blocked, with the exact
//                clause, citation, and Recover-to-YES path).
//
// This is what makes governance *legible*: you see precisely what the gate caught.
import { decide } from "../../gate/src/index.mjs";

/**
 * @param {Object} args
 * @param {Object} args.payload     the request to evaluate
 * @param {Object} args.authored    an authored policy from @aigovops/gate-author ({policy, citations, exitStates})
 * @param {Object} [args.baseline]  optional Lantern baseline (Stay-at-YES)
 * @param {Object} [args.current]   optional Lantern current snapshot
 * @param {number} [args.tolerance]
 * @param {Object} [args.beacon]    optional signing key
 */
export function compare({ payload, authored, baseline, current, tolerance, beacon }) {
  const ungoverned = {
    proceeded: true,
    outcome: payload,
    note: "No gate. The action runs as-is — nothing checked, nothing recorded, no way to contest it.",
  };

  const governed = decide({ policy: authored.policy, payload, baseline, current, tolerance, beacon });

  const umbrella = governed.gates.find((g) => g.gate === "umbrella");
  const blockedBy = (umbrella?.violations || []).map((v) => ({
    path: v.path,
    citations: authored.citations?.[v.path] || [],
    recoverToYes: authored.exitStates?.[v.path]?.recoverToYes || v.message,
  }));

  return {
    ungoverned,
    governed: {
      status: governed.status,
      proceeded: governed.status === "PASS",
      blockedBy,
      receipt: governed.receipt || null,
      publicKey: governed.publicKey || null,
    },
    narrative: narrate(governed, blockedBy),
  };
}

function narrate(governed, blockedBy) {
  if (governed.status === "PASS") {
    return "Ungoverned: ran unchecked. Governed: PASS — the request met every clause; a signed, verifiable receipt was issued. Same action, now auditable.";
  }
  const items = blockedBy
    .map((b) => `• ${b.citations.length ? b.citations.join(" · ") : "policy"} — ${b.recoverToYes}`)
    .join("\n");
  return (
    `Ungoverned: ran unchecked, no record. Governed: BLOCKED by ${blockedBy.length} clause(s); no receipt issued.\n` +
    `Recover to YES:\n${items}`
  );
}

// Demo: author a policy from a thin education policy, then compare a bad vs. good request.
if (import.meta.url === `file://${process.argv[1]}`) {
  const { improve } = await import("../../policy-improver/src/index.mjs");
  const { authorPolicy, compliantExample } = await import("../../gate-author/src/index.mjs");

  const report = improve("We use an AI tutor.", { sector: "education", jurisdiction: "EU", dataTypes: ["personal", "children"], riskTier: "high" });
  const authored = authorPolicy(report);

  console.log("=== ungoverned request (non-compliant) ===");
  const bad = compare({ payload: { model: "gpt-4" }, authored });
  console.log(bad.narrative, "\n");

  console.log("=== same request, made compliant ===");
  const good = compare({ payload: compliantExample(authored.policy), authored });
  console.log(good.narrative);
}
