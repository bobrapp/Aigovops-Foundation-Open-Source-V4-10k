import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { Ledger, view, route, canKill, serve } from "../src/index.mjs";

function seeded() {
  const l = new Ledger();
  l.record({ actor: "jeeves", action: "decide", status: "PASS" });
  l.record({ actor: "jeeves", action: "decide", status: "FAIL", citations: ["GDPR Art. 35"] });
  l.record({ actor: "member-1", action: "decide", status: "PASS" });
  return l;
}

test("steward sees everything; member sees only their own; unknown sees nothing", () => {
  const l = seeded();
  assert.equal(view(l, { role: "steward" }).count, 3);
  assert.equal(view(l, { role: "member", actor: "member-1" }).count, 1);
  const ghost = view(l, { role: "intruder" });
  assert.equal(ghost.count, 0);
  assert.equal(ghost.canKill, false); // fail-closed
});

test("only a steward may use the kill switch", () => {
  const l = seeded();
  assert.equal(canKill("steward"), true);
  assert.equal(canKill("developer"), false);
  assert.throws(() => l.kill("member"), /only a steward/);
  l.kill("steward");
  assert.equal(l.killed, true);
});

test("route enforces the kill-switch role gate", () => {
  const l = seeded();
  assert.equal(route("POST", "/api/kill", { role: "member" }, l).status, 403);
  assert.equal(l.killed, false);
  assert.equal(route("POST", "/api/kill", { role: "steward" }, l).status, 200);
  assert.equal(l.killed, true);
  assert.equal(route("GET", "/", {}, l).type, "text/html");
});

test("the live server serves a role-scoped oversight JSON", async () => {
  const l = seeded();
  const server = serve({ port: 0, ledger: l });
  await once(server, "listening");
  const { port } = server.address();
  try {
    const steward = await (await fetch(`http://127.0.0.1:${port}/api/oversight?role=steward`)).json();
    assert.equal(steward.count, 3);
    const member = await (await fetch(`http://127.0.0.1:${port}/api/oversight?role=member&actor=member-1`)).json();
    assert.equal(member.count, 1);
    const forbidden = await fetch(`http://127.0.0.1:${port}/api/kill?role=member`, { method: "POST" });
    assert.equal(forbidden.status, 403);
  } finally {
    server.close();
    await once(server, "close");
  }
});
