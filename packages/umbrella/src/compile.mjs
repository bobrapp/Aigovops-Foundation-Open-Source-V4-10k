// Umbrella policy compiler — turns a declarative policy into a deterministic
// evaluator. Zero dependencies. A control either passes or fails; never MAYBE.

export class PolicyError extends Error {}

const typeName = (v) => (Array.isArray(v) ? "array" : v === null ? "null" : typeof v);

// The operator set. Each is a pure predicate (value, target) → boolean.
export const OPERATORS = {
  required: (v) => v !== undefined && v !== null,
  equals: (v, t) => v === t,
  notEquals: (v, t) => v !== t,
  oneOf: (v, t) => Array.isArray(t) && t.includes(v),
  lessThan: (v, t) => typeof v === "number" && v < t,
  greaterThan: (v, t) => typeof v === "number" && v > t,
  matches: (v, t) => typeof v === "string" && new RegExp(t).test(v),
  type: (v, t) => typeName(v) === t,
};

/** Read a dotted path ("a.b.c") out of an object, safely. */
export function get(obj, path) {
  return String(path).split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

/**
 * Compile a policy `{ name, rules: [{ path, op, value?, message? }] }`
 * into `{ name, evaluate(input) → { status, violations } }`.
 * Throws PolicyError on a malformed policy.
 */
export function compile(policy) {
  if (!policy || typeof policy !== "object" || !Array.isArray(policy.rules)) {
    throw new PolicyError("policy must be an object with a rules[] array");
  }
  const rules = policy.rules.map((r, i) => {
    if (!r || typeof r.path !== "string") throw new PolicyError(`rule[${i}]: missing string "path"`);
    if (!OPERATORS[r.op]) throw new PolicyError(`rule[${i}]: unknown op "${r.op}"`);
    if (r.op === "matches") {
      try { new RegExp(r.value); } catch { throw new PolicyError(`rule[${i}]: invalid regex`); }
    }
    return r;
  });

  return {
    name: policy.name ?? "policy",
    evaluate(input = {}) {
      const violations = [];
      for (const r of rules) {
        const v = get(input, r.path);
        if (!OPERATORS[r.op](v, r.value)) {
          const expr = r.value !== undefined ? `${r.op} ${JSON.stringify(r.value)}` : r.op;
          violations.push({ path: r.path, rule: `${r.path} ${expr}`, message: r.message ?? `"${r.path}" must satisfy: ${expr}` });
        }
      }
      return { status: violations.length === 0 ? "PASS" : "FAIL", violations };
    },
  };
}

// Framework profiles — named, reusable policy bundles.
export const PROFILES = {
  // A minimal "safe to ship" profile: a recognized model and a human-in-the-loop flag.
  baseline: {
    name: "baseline",
    rules: [
      { path: "model", op: "matches", value: "^claude-", message: "Run on a supported Claude model." },
      { path: "humanApproved", op: "equals", value: true, message: "Irreversible actions need human approval." },
    ],
  },
};

/** Look up and compile a named framework profile. */
export function profile(name) {
  const p = PROFILES[name];
  if (!p) throw new PolicyError(`unknown profile "${name}"`);
  return compile(p);
}
