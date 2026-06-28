// Tier-1 agent: Compliance-Attestor.
// Runs a batch of governed checks through the unified gate and assembles a single SIGNED
// evidence bundle — the weekly "we are compliant, and here is the proof" artifact.
import { decide } from "../../gate/src/index.mjs";
import { signEvidence } from "../../beacon/src/index.mjs";

/**
 * @param {{checks: Array, beacon?, at?}} opts
 *   checks[i] = { name, policy|profile, payload, baseline?, current?, tolerance? }
 * @returns {{schema, at, results, summary, bundleReceipt, publicKey}}
 */
export function attest({ checks = [], beacon, at } = {}) {
  const results = checks.map((c) => {
    const d = decide({
      policy: c.policy, profile: c.profile, payload: c.payload,
      baseline: c.baseline, current: c.current, tolerance: c.tolerance,
      beacon, at,
    });
    return { name: c.name, status: d.status, receipt: d.receipt || null };
  });

  const summary = {
    total: results.length,
    pass: results.filter((r) => r.status === "PASS").length,
    fail: results.filter((r) => r.status === "FAIL").length,
  };

  // Sign the bundle as a whole — a verifiable attestation over the batch result.
  const signed = signEvidence({
    configured: true,
    payload: { schema: "aigovops.attestation/1", summary, checks: results.map((r) => ({ name: r.name, status: r.status })), at: at ?? null },
    privateKey: beacon?.privateKey,
    publicKey: beacon?.publicKey,
    issuedAt: at,
  });

  return { schema: "aigovops.attestation/1", at: at ?? null, results, summary, bundleReceipt: signed.receipt, publicKey: signed.publicKey };
}
