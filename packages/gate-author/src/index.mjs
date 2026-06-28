// Gate-Author (M2) — the developer's half of the journey.
//
// Takes the candidate gates a policy author surfaced (M1's suggestedGates) and authors a
// RUNNABLE Umbrella policy, attaching the three exit states to every gate:
//   Get to YES    — the deterministic criteria (the Umbrella predicate)
//   Stay at YES   — Lantern re-checks the controlled field; drift re-opens the gate
//   Recover to YES— the mitigation clause (how to get back to compliant)
//
// authorPolicy() compiles the result, so an authored policy is guaranteed to run on the gate.
import { compile } from "../../umbrella/src/index.mjs";

const human = (rule) => {
  const v = rule.value !== undefined ? ` ${JSON.stringify(rule.value)}` : "";
  return `${rule.path} ${rule.op}${v}`;
};

/**
 * @param {Array|{suggestedGates:Array}} input  M1's suggestedGates (or a full improve() report)
 * @param {{name?:string}} [opts]
 * @returns {{policy, exitStates, citations, compiled}}
 */
export function authorPolicy(input, { name = "authored-policy" } = {}) {
  const gates = Array.isArray(input) ? input : input.suggestedGates || [];
  if (!gates.length) throw new Error("authorPolicy: no candidate gates to author");

  const rules = [];
  const exitStates = {};
  const citations = {};   // path -> [citation]   (several regulations can control one field)
  const mitigations = {}; // path -> [mitigation]
  const seenRule = new Set();

  for (const g of gates) {
    const r = g.rule;
    (citations[r.path] ??= []);
    if (g.citation && !citations[r.path].includes(g.citation)) citations[r.path].push(g.citation);
    (mitigations[r.path] ??= []);
    if (g.mitigation && !mitigations[r.path].includes(g.mitigation)) mitigations[r.path].push(g.mitigation);

    // Dedupe identical rules — two regulations may demand the same control.
    const key = JSON.stringify(r);
    if (!seenRule.has(key)) {
      seenRule.add(key);
      rules.push({ ...r, message: g.mitigation || `Satisfy ${human(r)} (${g.citation}).` });
    }
  }

  for (const r of rules) {
    exitStates[r.path] = {
      getToYes: `Criteria met: ${human(r)}.`,
      stayAtYes: `Lantern monitors "${r.path}" against its approved baseline; drift beyond tolerance re-opens this gate.`,
      recoverToYes: mitigations[r.path].join(" ") || `Bring "${r.path}" back into compliance.`,
    };
  }

  const policy = { name, rules };
  const compiled = compile(policy); // throws on a malformed policy → guarantees runnable
  return { policy, exitStates, citations, compiled };
}

/** Synthesize a minimal payload that SATISFIES an authored policy — "what compliance looks like." */
export function compliantExample(policy) {
  const out = {};
  const setDeep = (obj, path, val) => {
    const parts = path.split(".");
    let o = obj;
    for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]] ??= {};
    o[parts[parts.length - 1]] = val;
  };
  const valueFor = (r) => {
    switch (r.op) {
      case "equals": return r.value;
      case "oneOf": return Array.isArray(r.value) ? r.value[0] : null;
      case "lessThan": return (r.value ?? 1) - 1;
      case "greaterThan": return (r.value ?? 0) + 1;
      case "matches": return "compliant";
      case "required": default: return true;
    }
  };
  for (const r of policy.rules) setDeep(out, r.path, valueFor(r));
  return out;
}

/** Render the authored gates + exit states as a developer-facing spec. */
export function toMarkdown(authored) {
  const lines = [`# Authored policy: \`${authored.policy.name}\``, ``];
  for (const r of authored.policy.rules) {
    const ex = authored.exitStates[r.path];
    lines.push(
      `## \`${r.path}\`  *(${(authored.citations[r.path] || []).join(" · ")})*`,
      `- **Gate (criteria):** \`${JSON.stringify({ path: r.path, op: r.op, ...(r.value !== undefined ? { value: r.value } : {}) })}\``,
      `- **Get to YES:** ${ex.getToYes}`,
      `- **Stay at YES:** ${ex.stayAtYes}`,
      `- **Recover to YES:** ${ex.recoverToYes}`,
      ``,
    );
  }
  return lines.join("\n");
}
