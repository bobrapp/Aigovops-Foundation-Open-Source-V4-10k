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

## v-next (M7)

- **Statistical / distributional drift** (`distributionDrift`) — `psi` (Population Stability Index),
  `klFromSamples` (KL divergence), and `ksStatistic` (Kolmogorov–Smirnov). Catches a shifted
  *distribution* even when every individual value is in range. Evidently-compatible thresholds.
- **Data-quality gates** (`evaluateSuite`) — a Great-Expectations-style expectation suite
  (`not_null`, `between`, `in_set`, `unique`, `match_regex`, `row_count_between`) → the same
  PASS/FAIL gate shape, with a mitigation per failed expectation.
- **Continuous monitoring** (`Monitor`) — runs structural, distributional, and quality checks
  against their baselines; pair with `@aigovops/scheduler` to run hands-off.
- **Alerting** (`Alerter`, `alertmanagerChannel`) — routes any FAIL to one or more channels in
  **Alertmanager** wire format (POST `/api/v2/alerts`).
- **Trace signal** — `JaegerTraces` (in `@aigovops/adapters`) reports a service's trace error rate.
