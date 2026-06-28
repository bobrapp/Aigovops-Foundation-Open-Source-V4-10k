# Lantern

Monitoring & drift — **semantic diff, drift detection, escalation**.

PASS / FAIL — never MAYBE.

## How it works

Lantern compares a **baseline** snapshot to a **current** one, ignores numeric moves
inside a relative `tolerance`, and gates on anything that actually drifted. Every drift
carries a mitigation and an escalation level.

```js
import { detectDrift } from "@aigovops/lantern";

detectDrift({
  baseline: { latencyMs: 100, guardrail: true },
  current:  { latencyMs: 180 },          // slower AND a guardrail vanished
  tolerance: 0.1,
});
// → { status: "FAIL", drift: [...], escalate: "escalate", mitigation: [...] }
```

- **Numeric drift** — relative move ≤ `tolerance` is allowed; beyond it is drift.
- **Structural drift** — an added or removed field always counts, and escalates.
- **Escalation** — `none` · `notify` (small value drift) · `escalate` (structural, or >3 changes).

Run the live demo: `node packages/lantern/src/index.mjs`
