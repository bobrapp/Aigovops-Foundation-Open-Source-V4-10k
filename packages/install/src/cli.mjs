#!/usr/bin/env node
// `aigovops-install` — the guided first run.
import { onboard, toTranscript } from "./index.mjs";

const result = onboard({
  principals: { "bob@aigovops": "steward", "dev@aigovops": "developer", "faculty@school": "policy-author" },
  capsProfiles: { "jeeves": { level: "act", maxSpend: 100, maxRate: 30, maxBlastRadius: 5 } },
  writtenPolicy: "Our school uses an AI tutor. Teachers can override its suggestions and we tell students it is AI.",
  context: { sector: "education", jurisdiction: "EU", dataTypes: ["personal", "children"], riskTier: "high" },
});

console.log(toTranscript(result));
console.log(`\nNext: start the dashboard →  node packages/control-room/src/cli.mjs`);
