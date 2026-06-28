# AiGovOps Desktop (Tauri)

A 1-click, double-clickable desktop app (macOS · Windows · Linux) built with **Tauri** (Apache-2.0,
108k★). It bundles the zero-dependency gate server as a Node sidecar and opens the **Wizard** — so a
non-technical user gets governed without ever touching a terminal.

## Scaffold status

This is the build scaffold (config + the Rust entry point). To produce installers you need the Rust
toolchain and the Tauri CLI:

```bash
cargo install create-tauri-app   # one-time
cd desktop && npm create tauri-app  # or wire this src-tauri/ into a Tauri project
cargo tauri build                # → .dmg / .msi / .AppImage
```

The app starts `node packages/server/src/cli.mjs` (bundled under `resources/`) and loads
`http://localhost:8930` — the same Wizard, Studio, and gate API as every other install path. Icons go in
`src-tauri/icons/`.
