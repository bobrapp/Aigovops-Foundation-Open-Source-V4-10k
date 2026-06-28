// M18 — compile an authored Umbrella policy to real OPA Rego. Closes the ROADMAP "OPA · Rego library"
// gap: the same gates that run in the zero-dep core can now be enforced by an OPA sidecar / Gatekeeper /
// Conftest, byte-for-byte the same contract. deny carries the cited mitigation message.
import { PolicyError } from "./compile.mjs";

const lit = (v) => JSON.stringify(v);
const ref = (path) => "input." + String(path).split(".").join(".");

// op → the Rego condition under which the rule is VIOLATED (so it joins `deny`).
function violation(r) {
  const p = ref(r.path);
  switch (r.op) {
    case "required": return `not ${p}`;
    case "equals": return `${p} != ${lit(r.value)}`;
    case "notEquals": return `${p} == ${lit(r.value)}`;
    case "oneOf": return `not ${p} in {${(r.value || []).map(lit).join(", ")}}`;
    case "lessThan": return `${p} >= ${lit(r.value)}`;
    case "greaterThan": return `${p} <= ${lit(r.value)}`;
    case "matches": return `not regex.match(${lit(r.value)}, ${p})`;
    case "type": return `not is_${r.value === "array" ? "array" : r.value}(${p})`;
    default: throw new PolicyError(`toRego: unknown op "${r.op}"`);
  }
}

/** @returns {string} a Rego module: `allow` is true only when no rule is violated; `deny` lists cited reasons. */
export function toRego(policy, opts = {}) {
  if (!policy || !Array.isArray(policy.rules)) throw new PolicyError("toRego requires a compiled policy { rules }");
  const pkg = opts.package || `aigovops.${(policy.name || "policy").replace(/[^a-z0-9_]+/gi, "_").toLowerCase()}`;
  const blocks = policy.rules.map((r) => {
    const msg = r.message || `Satisfy ${r.path} ${r.op}.`;
    return `deny contains msg if {\n\t${violation(r)}\n\tmsg := ${lit(msg)}\n}`;
  });
  return [
    `package ${pkg}`,
    "",
    "import rego.v1",
    "",
    "default allow := false",
    "",
    "allow if count(deny) == 0",
    "",
    blocks.join("\n\n"),
    "",
  ].join("\n");
}
