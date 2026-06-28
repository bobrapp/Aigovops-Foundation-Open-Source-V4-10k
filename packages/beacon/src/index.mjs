import { gate } from "../../../shared/gate.mjs";
import { signReceipt, verifyReceipt, generateKeypair } from "./sign.mjs";

export { signReceipt, verifyReceipt, generateKeypair, hashEvidence, canonicalize } from "./sign.mjs";
// Beacon v-next (M6)
export { Ledger } from "./ledger.mjs";
export { KeyRing } from "./keys.mjs";
export { toInTotoStatement, toDsseEnvelope, verifyDsse, attest, IN_TOTO_STATEMENT, SLSA_PROVENANCE } from "./attestation.mjs";
export { evidenceFromMlflow, signMlflowModel } from "./mlflow.mjs";

// Beacon — Audit & proof. Runs its gate; on PASS, signs a verifiable evidence receipt.
export function signEvidence(input = {}) {
  const result = gate("beacon", [
    { id: "beacon:evidence-present", pass: input.payload != null, fix: "Provide an evidence payload for Beacon to sign." },
    {
      id: "beacon:signing-key",
      pass: input.privateKey != null || input.configured === true,
      fix: "Provide a signing key (input.privateKey) — in production, from the secrets broker.",
    },
  ]);

  if (result.status !== "PASS") return result;

  // Sign for real with the supplied key, or mint an ephemeral demo key.
  const keys = input.privateKey
    ? { privateKey: input.privateKey, publicKey: input.publicKey }
    : generateKeypair();
  const receipt = signReceipt(input.payload, keys.privateKey, { issuedAt: input.issuedAt });

  return { ...result, receipt, publicKey: keys.publicKey };
}

// Demo when run directly: sign, then verify the receipt offline.
if (import.meta.url === `file://${process.argv[1]}`) {
  const out = signEvidence({ configured: true, payload: { model: "claude-opus-4-8", decision: "PASS" } });
  const ok = verifyReceipt(out.receipt, out.publicKey);
  console.log(JSON.stringify({ ...out, verified: ok }, null, 2));
}
