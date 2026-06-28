# Umbrella

Policy & gates — **policy compiler, code gates, framework profiles**.

PASS / FAIL — never MAYBE.

## How it works

Umbrella compiles a declarative policy into a deterministic evaluator. Each rule is a
`path` + `op` (+ optional `value`); the payload either satisfies every rule or fails with
one mitigation per violation.

```js
import { compilePolicy } from "@aigovops/umbrella";

compilePolicy({
  policy: {
    name: "inference",
    rules: [
      { path: "model", op: "oneOf", value: ["claude-opus-4-8", "claude-sonnet-4-6"] },
      { path: "temperature", op: "lessThan", value: 1.5 },
      { path: "owner", op: "required" },
    ],
  },
  payload: { model: "gpt-4", temperature: 2.0 },
});
// → { status: "FAIL", violations: [...], mitigation: [...] }
```

- **Operators:** `required`, `equals`, `notEquals`, `oneOf`, `lessThan`, `greaterThan`, `matches` (regex), `type`.
- **Framework profiles:** named, reusable bundles. Ships with `baseline`
  (`compilePolicy({ profile: "baseline", payload })`).
- A malformed policy fails the compile gate — it never throws to the caller.

Run the live demo: `node packages/umbrella/src/index.mjs`
