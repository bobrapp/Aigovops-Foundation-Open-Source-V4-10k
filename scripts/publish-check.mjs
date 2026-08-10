#!/usr/bin/env node
// Publish-readiness gate (Phase 3, anoint revive) — REVERSIBLE, publishes nothing.
//
// Runs `npm pack --dry-run` across every @aigovops/* workspace and reports what WOULD
// ship, flagging the things to fix before a real publish. It never calls `npm publish`;
// the actual publish + npm-scope reservation are founder gates (see REVIVE.md).
//
//   node scripts/publish-check.mjs
//
// Exit 0 if every package is publishable (warnings allowed); exit 1 on a hard blocker
// (a package marked private, or missing a name/version).
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const root = JSON.parse(readFileSync(new URL("../package.json", import.meta.url)));
let packed;
try {
  packed = JSON.parse(
    execSync("npm pack --workspaces --dry-run --json", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }),
  );
} catch (e) {
  console.error("publish-check: `npm pack --workspaces` failed —", e.message);
  process.exit(1);
}

const rows = [];
let blockers = 0;
let warnings = 0;

for (const pkg of packed) {
  const dir = (pkg.files?.[0] && packed.length) ? null : null; // files are tarball-relative; read manifest via name
  // Resolve the manifest from the workspace list to inspect fields npm-pack omits.
  const wsPath = (root.workspaces || [])
    .flatMap((g) => (g.endsWith("/*") ? [] : [g]))
    .concat(["packages/" + (pkg.name || "").replace(/^@aigovops\//, "")]);
  let manifest = {};
  for (const p of [...wsPath, "jeeves", "shared"]) {
    try {
      const m = JSON.parse(readFileSync(new URL(`../${p}/package.json`, import.meta.url)));
      if (m.name === pkg.name) { manifest = m; break; }
    } catch { /* not this dir */ }
  }

  const fileNames = (pkg.files || []).map((f) => f.path || f);
  const includesTests = fileNames.some((f) => /(^|\/)test\//.test(f) || /\.test\.mjs$/.test(f));
  const hasFilesField = Array.isArray(manifest.files);
  const hasRepo = !!manifest.repository;
  const isPrivate = !!manifest.private;

  const notes = [];
  if (isPrivate) { notes.push("BLOCKER: private:true"); blockers++; }
  if (!pkg.name || !pkg.version) { notes.push("BLOCKER: missing name/version"); blockers++; }
  if (includesTests && !hasFilesField) { notes.push("packs test/ — add files:[...]"); warnings++; }
  if (!hasRepo) { notes.push("no repository field"); warnings++; }

  rows.push({ name: pkg.name, version: pkg.version, files: fileNames.length, notes });
}

const pad = (s, n) => String(s).padEnd(n);
console.log(`\nPublish-readiness — ${rows.length} @aigovops/* packages (dry-run, nothing published)\n`);
console.log(pad("package", 26), pad("ver", 8), pad("files", 6), "notes");
console.log("-".repeat(78));
for (const r of rows.sort((a, b) => a.name.localeCompare(b.name))) {
  console.log(pad(r.name, 26), pad(r.version, 8), pad(r.files, 6), r.notes.join("; ") || "ready");
}
console.log("-".repeat(78));
console.log(`\n${rows.length - blockers}/${rows.length} publishable · ${blockers} blocker(s) · ${warnings} warning(s)`);
console.log("Real publish + npm-scope reservation are founder gates — this script never publishes.\n");
process.exit(blockers > 0 ? 1 : 0);
