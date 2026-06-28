// M16 — the evidence vault. The gate was stateless; now every signed decision is appended to a
// per-tenant, hash-chained Beacon ledger so evidence is queryable, chain-verifiable, and exportable
// as a signed audit/DSAR bundle. Role-scoped: stewards/auditors see all; members see only their own.
import { Ledger, signEvidence, verifyReceipt } from "../../beacon/src/index.mjs";

const ledgers = new Map(); // tenant -> Ledger

function ledgerFor(tenant = "local") {
  if (!ledgers.has(tenant)) ledgers.set(tenant, new Ledger());
  return ledgers.get(tenant);
}

/** Append a signed decision receipt to the tenant's evidence chain. */
export async function recordDecision({ tenant = "local", receipt, actor = "anon", action = "decide" } = {}) {
  if (!receipt) return null;
  return ledgerFor(tenant).append({ actor, action, receipt });
}

/** Role-scoped query over the evidence chain. */
export function listEvidence({ tenant = "local", role = "steward", actor } = {}) {
  const l = ledgerFor(tenant);
  const seeAll = role === "steward" || role === "auditor" || role === "developer";
  // Ledger stores the appended record under entry.receipt → { actor, action, receipt }.
  const entries = seeAll ? l.entries : l.entries.filter((e) => e.receipt?.actor === actor);
  return { count: entries.length, chain: l.verifyChain(), entries };
}

/** Verify the whole chain — any edit/reorder/deletion is detected. */
export function verifyEvidence({ tenant = "local" } = {}) {
  return ledgerFor(tenant).verifyChain();
}

/** A signed audit / DSAR bundle: all evidence (optionally for one subject), with a signed summary. */
export function evidenceBundle({ tenant = "local", subject, beacon, at } = {}) {
  const l = ledgerFor(tenant);
  const entries = subject ? l.entries.filter((e) => e.receipt?.actor === subject) : l.entries;
  const ev = signEvidence({
    configured: true,
    payload: { schema: "aigovops.dsar/1", tenant, subject: subject ?? null, count: entries.length, chainOk: l.verifyChain().ok, at: at ?? null },
    privateKey: beacon?.privateKey,
    publicKey: beacon?.publicKey,
    issuedAt: at,
  });
  return { schema: "aigovops.dsar/1", tenant, subject: subject ?? null, count: entries.length, entries, bundleReceipt: ev.receipt, publicKey: ev.publicKey };
}

/** Test/ops helper: drop a tenant's chain. */
export function _reset(tenant) { ledgers.delete(tenant); }
export { verifyReceipt };
