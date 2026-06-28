import { test } from "node:test";
import assert from "node:assert/strict";
import { toSeccompProfile, toNftablesEgress, toRunscRuntimeClass, sandboxFor } from "../src/index.mjs";

test("seccomp profile denies by default and allows the baseline + extras", () => {
  const p = toSeccompProfile({ allow: ["socket"] });
  assert.equal(p.defaultAction, "SCMP_ACT_ERRNO");
  assert.ok(p.syscalls[0].names.includes("read"));   // baseline
  assert.ok(p.syscalls[0].names.includes("socket")); // extra
});

test("nftables egress is default-drop and proxy-only; requires a proxy", () => {
  const nft = toNftablesEgress({ proxyHost: "10.0.0.9", proxyPort: 3128 });
  assert.match(nft, /policy drop/);
  assert.match(nft, /ip daddr 10\.0\.0\.9 tcp dport 3128 accept/);
  assert.throws(() => toNftablesEgress({}), /declared proxy/);
});

test("gVisor RuntimeClass selects runsc", () => {
  const rc = toRunscRuntimeClass();
  assert.equal(rc.kind, "RuntimeClass");
  assert.equal(rc.handler, "runsc");
});

test("sandboxFor bundles all three artifacts", () => {
  const s = sandboxFor({ allowSyscalls: ["socket"], proxyHost: "10.0.0.9" });
  assert.ok(s.seccomp && s.nftables && s.runtimeClass);
});
