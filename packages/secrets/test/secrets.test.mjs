import { test } from "node:test";
import assert from "node:assert/strict";
import { SecretsProvider, EnvProvider, VaultProvider, SecretsError, mask } from "../src/index.mjs";

test("mask never reveals a raw secret", () => {
  assert.equal(mask("supersecretvalue"), "su…ue");
  assert.equal(mask("ab"), "**");
});

test("issue mints a scoped, expiring grant — and never the raw secret", () => {
  let t = 1000;
  const b = new SecretsProvider([new EnvProvider()], { now: () => t });
  const grant = b.issue("github-deploy", 60, "gate", { parent: "receipt-1" });
  assert.equal(grant.scope, "github-deploy");
  assert.equal(grant.parent, "receipt-1");
  assert.equal(grant.expiresAt, 1000 + 60_000);
  assert.ok(grant.token && !("secret" in grant)); // a handle, not the value
});

test("redeem resolves the secret from env; expiry and revoke are enforced", async () => {
  let t = 1000;
  process.env.AIGOVOPS_SECRET_GITHUB_DEPLOY = "ghp_xyz";
  const b = new SecretsProvider([new EnvProvider()], { now: () => t });
  const grant = b.issue("github-deploy", 60, "gate");
  assert.equal(await b.redeem(grant.token), "ghp_xyz");

  t += 61_000; // past TTL
  await assert.rejects(() => b.redeem(grant.token), SecretsError);

  const g2 = b.issue("github-deploy", 60, "gate");
  b.revoke(g2.token);
  await assert.rejects(() => b.redeem(g2.token), SecretsError);
  delete process.env.AIGOVOPS_SECRET_GITHUB_DEPLOY;
});

test("resolve raises when no backend yields", async () => {
  const b = new SecretsProvider([new EnvProvider()]);
  await assert.rejects(() => b.resolve("nonexistent-secret"), SecretsError);
});

test("VaultProvider reads a KV v2 secret (Vault / OpenBao, injected transport)", async () => {
  const calls = [];
  const transport = async (req) => { calls.push(req); return { status: 200, json: { data: { data: { value: "s3cr3t" } } } }; };
  const vault = new VaultProvider({ addr: "https://vault:8200", token: "tok", transport });
  assert.equal(vault.usable(), true);
  assert.equal(await vault.fetch("github-deploy"), "s3cr3t");
  assert.match(calls[0].url, /\/v1\/secret\/data\/github-deploy$/);
  assert.equal(calls[0].headers["X-Vault-Token"], "tok");

  // wired into the broker: redeem resolves through Vault
  const b = new SecretsProvider([vault]);
  const g = b.issue("github-deploy", 60, "gate");
  assert.equal(await b.redeem(g.token), "s3cr3t");
});
