#!/usr/bin/env node
import { serve } from "./index.mjs";
const port = Number(process.env.PORT || 8930);
serve({ port });
console.log(`AiGovOps Gate API → http://localhost:${port}  (POST /v1/decide · GET /healthz · /openapi.json)`);
