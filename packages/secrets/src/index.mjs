// The secrets broker — one credential plane for every effector.
// Ported from Omni-v4's SecretsProvider. By the law, agents never hold credentials:
// the gate issues a scoped, expiring GRANT (a handle, never the raw value); an
// effector REDEEMS that handle inside the privileged core to resolve the real secret.
//
// One interface, several backends tried in priority order — identical semantics in
// lab and fleet; swap the backend, not the effector:
//   1. EnvProvider       AIGOVOPS_SECRET_<NAME>      (CI / lab)
//   2. KeychainProvider  macOS login Keychain         (lab default)   [wire later]
//   3. VaultProvider     Vault / cloud KMS            (enclave)        [wire later]
import { randomUUID, randomBytes } from "node:crypto";

export class SecretsError extends Error {}

const envKey = (name) => "AIGOVOPS_SECRET_" + String(name).toUpperCase().replace(/-/g, "_");

/** Safe-to-log rendering. Never print a raw secret. */
export function mask(value, show = 2) {
  if (!value) return "(empty)";
  if (value.length <= show * 2) return "*".repeat(value.length);
  return `${value.slice(0, show)}…${value.slice(-show)}`;
}

// --- backends ---------------------------------------------------------------
export class EnvProvider {
  name = "env";
  usable() { return true; }
  fetch(name) { return process.env[envKey(name)] || null; }
}
export class KeychainProvider {
  name = "keychain";
  usable() { return process.platform === "darwin"; }
  fetch() { return null; } // named for parity; wire `security find-generic-password` later
}
export class VaultProvider {
  name = "vault";
  usable() { return !!process.env.AIGOVOPS_VAULT_ADDR; }
  fetch() { return null; } // named for parity; wire the Vault/KMS API later
}

// --- the broker -------------------------------------------------------------
export class SecretsProvider {
  constructor(providers, opts = {}) {
    this.providers = providers && providers.length ? providers : [new EnvProvider()];
    this.now = opts.now || (() => Date.now());
    this._grants = new Map(); // token -> grant
  }

  static default() {
    return new SecretsProvider([new EnvProvider(), new KeychainProvider(), new VaultProvider()]);
  }

  /** Resolve a raw secret by logical name. For effectors only — never logged. Raises if no backend yields. */
  resolve(name, account = null) {
    for (const p of this.providers) {
      if (typeof p.usable === "function" && !p.usable()) continue;
      const val = p.fetch(name, account);
      if (val) return val;
    }
    throw new SecretsError(`no provider resolved secret '${name}'`);
  }

  /**
   * Gate-facing: mint a scoped, expiring grant. Returns a handle — NOT the secret.
   * @returns {{id, scope, requestedBy, parent, issuedAt, expiresAt, token}}
   */
  issue(scope, ttlSeconds, requestedBy = "gate", opts = {}) {
    if (!scope) throw new SecretsError("issue requires a scope");
    const issuedAt = this.now();
    const grant = {
      id: randomUUID(),
      scope,
      requestedBy,
      parent: opts.parent ?? null,
      issuedAt,
      expiresAt: issuedAt + (ttlSeconds ?? 0) * 1000,
      token: randomBytes(18).toString("base64url"),
    };
    this._grants.set(grant.token, grant);
    return grant;
  }

  isExpired(tokenOrGrant) {
    const g = typeof tokenOrGrant === "string" ? this._grants.get(tokenOrGrant) : tokenOrGrant;
    if (!g) return true;
    return this.now() >= g.expiresAt;
  }

  /** Effector-facing: redeem a grant inside the privileged core → the raw secret. */
  redeem(token, account = null) {
    const g = this._grants.get(token);
    if (!g) throw new SecretsError("unknown or revoked grant");
    if (this.isExpired(g)) throw new SecretsError(`grant for '${g.scope}' expired`);
    return this.resolve(g.scope, account);
  }

  revoke(token) {
    return this._grants.delete(token);
  }
}
