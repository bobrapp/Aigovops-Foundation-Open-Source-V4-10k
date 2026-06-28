# Contributing

Thanks for helping govern AI responsibly.

- **Gates are binary.** Every control returns PASS or FAIL — never MAYBE.
  A new check must define both its pass condition and its mitigation path.
- **Zero runtime dependencies** in the core. Node 20+ standard library only.
- **Tests:** add a `test/*.test.mjs` using `node:test` + `node:assert`.
  CI runs `node --test`; keep it green.
- **Humans hold the keys.** Never automate an irreversible move (publishing,
  credential entry, access changes) without an explicit human gate.

Open an issue or PR. Be precise and honest; don't overclaim.
