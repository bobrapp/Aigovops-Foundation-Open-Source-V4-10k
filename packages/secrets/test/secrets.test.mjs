import { test } from "node:test";
import assert from "node:assert/strict";
import { SecretsProvider, EnvProvider, SecretsError, mask } from "../src/index.mjs";

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

test("redeem resolves the secret from env; expiry and revoke are enforced", () => {
  let t = 1000;
  process.env.AIGOVOPS_SECRET_GITHUB_DEPLOY = "ghp_xyz";
  const b = new SecretsProvider([new EnvProvider()], { now: () => t });
  const grant = b.issue("github-deploy", 60, "gate");
  assert.equal(b.redeem(grant.token), "ghp_xyz");

  t += 61_000; // past TTL
  assert.throws(() => b.redeem(grant.token), SecretsError);

  const g2 = b.issue("github-deploy", 60, "gate");
  b.revoke(g2.token);
  assert.throws(() => b.redeem(g2.token), SecretsError);
  delete process.env.AIGOVOPS_SECRET_GITHUB_DEPLOY;
});

test("resolve raises when no backend yields", () => {
  const b = new SecretsProvider([new EnvProvider()]);
  assert.throws(() => b.resolve("nonexistent-secret"), SecretsError);
});
