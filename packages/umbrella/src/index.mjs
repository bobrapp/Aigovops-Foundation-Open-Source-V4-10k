import { gate } from "../../../shared/gate.mjs";

// Umbrella — Policy & gates — policy compiler, code gates, framework profiles.
export function compilePolicy(input = {}) {
  // Stub gate. Replace checks with real umbrella controls.
  return gate("umbrella", [
    { id: "umbrella:configured", pass: input.configured === true, fix: "Configure Umbrella before running its gate." },
    { id: "umbrella:input-present", pass: input.payload != null, fix: "Provide an input payload for Umbrella to evaluate." },
  ]);
}

// Demo when run directly.
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(compilePolicy({ configured: true, payload: "demo" }), null, 2));
}
