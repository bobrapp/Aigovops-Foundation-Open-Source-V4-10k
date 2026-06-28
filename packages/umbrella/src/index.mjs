import { gate } from "../../../shared/gate.mjs";
import { compile, profile, PolicyError } from "./compile.mjs";

export { compile, profile, PolicyError, OPERATORS, PROFILES } from "./compile.mjs";
// Umbrella v-next (M8)
export { compileFrameworkProfile, availableProfiles } from "./profiles.mjs";
export { Enforcer } from "./authz.mjs";
export { toKyvernoPolicy } from "./kyverno.mjs";
export { PolicyRegistry } from "./lifecycle.mjs";

// Umbrella — Policy & gates. Compiles a declarative policy (or a named profile),
// evaluates the payload against it, and gates on the violations.
export function compilePolicy(input = {}) {
  const { policy, profile: profileName, payload } = input;

  let compiled;
  try {
    compiled = profileName ? profile(profileName) : compile(policy);
  } catch (e) {
    if (e instanceof PolicyError) {
      return gate("umbrella", [{ id: "umbrella:policy-compiles", pass: false, fix: `Fix the policy: ${e.message}` }]);
    }
    throw e;
  }

  const { violations } = compiled.evaluate(payload ?? {});
  const result = gate(
    "umbrella",
    violations.length === 0
      ? [{ id: `umbrella:${compiled.name}:satisfied`, pass: true }]
      : violations.map((v) => ({ id: `umbrella:${v.path}`, pass: false, fix: v.message })),
  );
  return { ...result, policy: compiled.name, violations };
}

// Demo when run directly: the baseline profile against a non-compliant payload.
if (import.meta.url === `file://${process.argv[1]}`) {
  const out = compilePolicy({ profile: "baseline", payload: { model: "gpt-4", humanApproved: false } });
  console.log(JSON.stringify(out, null, 2));
}
