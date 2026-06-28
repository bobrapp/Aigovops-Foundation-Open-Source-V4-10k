// The Yes-Gate — single source of gate logic for all products.
// A control either PASSes or FAILs. Never MAYBE.
export const PASS = "PASS";
export const FAIL = "FAIL";

/**
 * Evaluate a named gate over a list of checks.
 * @param {string} name
 * @param {Array<{id: string, pass: boolean, fix?: string}>} checks
 * @returns {{gate: string, status: "PASS"|"FAIL", failed: string[], mitigation: string[]}}
 */
export function gate(name, checks) {
  const failed = checks.filter((c) => !c.pass);
  const status = failed.length === 0 ? PASS : FAIL;
  return {
    gate: name,
    status,
    failed: failed.map((c) => c.id),
    // Recover to YES: every FAIL ships a mitigation path.
    mitigation: failed.map((c) => c.fix ?? `Remediate: ${c.id}`),
  };
}
