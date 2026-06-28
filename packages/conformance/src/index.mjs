// M9 — the conformance suite.
//
// The behavioral contract a gate implementation must satisfy to be "governed-core compatible",
// in ANY language. Point runConformance() at an impl exposing { decide } with our wire shape;
// each check encodes one non-negotiable property of the Yes-Gate. This is how a Python or Go
// port proves it behaves identically to the reference.
import { decide } from "../../gate/src/index.mjs";
import { verifyReceipt } from "../../beacon/src/index.mjs";
import { Caps } from "../../caps/src/index.mjs";

const PASS = {
  profile: "baseline",
  payload: { model: "claude-opus-4-8", humanApproved: true },
  baseline: { a: 1 }, current: { a: 1 }, tolerance: 0,
};

export const CONFORMANCE = [
  {
    id: "clean-pass-is-signed-and-verifies",
    why: "A clean run must PASS and produce a receipt that verifies offline.",
    run: (g) => { const r = g.decide(PASS); return r.status === "PASS" && verifyReceipt(r.receipt, r.publicKey); },
  },
  {
    id: "criteria-fail-emits-no-receipt",
    why: "Failing the criteria must deny with mitigation and sign nothing.",
    run: (g) => { const r = g.decide({ profile: "baseline", payload: {} }); return r.status === "FAIL" && r.receipt === undefined && r.mitigation.length > 0; },
  },
  {
    id: "irreversible-needs-explicit-approval",
    why: "An irreversible action must not proceed without an explicit human approval.",
    run: (g) => { const r = g.decide({ ...PASS, irreversible: true }); return r.status === "FAIL" && r.reason === "awaiting-approval"; },
  },
  {
    id: "deny-is-auditable",
    why: "An explicit deny of an irreversible action is itself signed.",
    run: (g) => { const r = g.decide({ ...PASS, irreversible: true, decision: "deny" }); return r.reason === "denied" && verifyReceipt(r.receipt, r.publicKey); },
  },
  {
    id: "caps-fail-closed",
    why: "With no capability profile, the gate pauses (fail-closed), never proceeds.",
    run: (g) => { const r = g.decide({ ...PASS, caps: new Caps(), requestedBy: "x", cost: { spend: 1 } }); return r.status === "FAIL" && /capped/.test(r.reason); },
  },
  {
    id: "drift-beyond-tolerance-denies",
    why: "Drift past tolerance must deny.",
    run: (g) => g.decide({ ...PASS, current: { a: 100 } }).status === "FAIL",
  },
];

/** Run the suite against an implementation (defaults to the reference gate). */
export function runConformance(impl = { decide }) {
  const results = CONFORMANCE.map((c) => {
    let ok = false, error = null;
    try { ok = !!c.run(impl); } catch (e) { error = e.message; }
    return { id: c.id, ok, error };
  });
  const passed = results.filter((r) => r.ok).length;
  return { conformant: passed === results.length, passed, total: results.length, results };
}
