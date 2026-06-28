#!/usr/bin/env node
// `aigovops-control-room` — start the dashboard with a small seeded ledger.
import { serve, Ledger } from "./index.mjs";

const ledger = new Ledger();
ledger.record({ actor: "jeeves", action: "decide", status: "PASS", citations: ["EU AI Act Art. 14"] });
ledger.record({ actor: "jeeves", action: "decide", status: "FAIL", citations: ["GDPR Art. 35"] });
ledger.record({ actor: "member-1", action: "decide", status: "PASS" });

const port = Number(process.env.PORT || 8920);
serve({ port, ledger });
console.log(`AiGovOps Control Room → http://localhost:${port}  (try ?role=steward vs ?role=member)`);
