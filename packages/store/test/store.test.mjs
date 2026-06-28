import { test } from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rmSync } from "node:fs";
import { MemoryStore, FileStore, namespaced } from "../src/index.mjs";

test("MemoryStore: set/get/list/append/del", async () => {
  const s = new MemoryStore();
  await s.set("a", 1);
  assert.equal(await s.get("a"), 1);
  assert.equal(await s.get("missing"), null);
  await s.append("log", "x");
  await s.append("log", "y");
  assert.deepEqual(await s.get("log"), ["x", "y"]);
  assert.deepEqual((await s.list()).sort(), ["a", "log"]);
  assert.equal(await s.del("a"), true);
});

test("FileStore persists across instances (durable)", async () => {
  const path = join(tmpdir(), `aigovops-store-${process.pid}.json`);
  try {
    const a = new FileStore({ path });
    await a.set("ledger:0", { hash: "abc" });
    await a.append("baselines", { cost: 100 });
    const b = new FileStore({ path }); // fresh instance reads from disk
    assert.deepEqual(await b.get("ledger:0"), { hash: "abc" });
    assert.deepEqual(await b.get("baselines"), [{ cost: 100 }]);
  } finally {
    rmSync(path, { force: true });
  }
});

test("namespaced view scopes keys", async () => {
  const s = new MemoryStore();
  const policies = namespaced(s, "policies");
  await policies.set("v1", { rules: [] });
  assert.deepEqual(await policies.get("v1"), { rules: [] });
  assert.deepEqual(await policies.list(), ["v1"]);
  assert.deepEqual(await s.list(), ["policies:v1"]); // stored under the namespace prefix
});
