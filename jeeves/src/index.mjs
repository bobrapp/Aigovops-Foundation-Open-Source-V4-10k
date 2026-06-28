import { signEvidence } from "../../packages/beacon/src/index.mjs";
import { detectDrift } from "../../packages/lantern/src/index.mjs";
import { compilePolicy } from "../../packages/umbrella/src/index.mjs";

// Jeeves orchestrates the three product gates and reports the verdict.
// Agents do the bureaucracy; humans hold the meaning.
export function orchestrate(input = {}) {
  const gates = [
    signEvidence(input.beacon),
    detectDrift(input.lantern),
    compilePolicy(input.umbrella),
  ];
  const status = gates.every((g) => g.status === "PASS") ? "PASS" : "FAIL";
  return { status, gates };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const demo = orchestrate({
    beacon: { configured: true, payload: "evidence" },
    lantern: { configured: true, payload: "snapshot" },
    umbrella: { configured: true, payload: "policy" },
  });
  console.log(JSON.stringify(demo, null, 2));
}
