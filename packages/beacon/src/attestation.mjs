// Beacon v-next (M6) — standards-grade attestation.
//
// Turns a Beacon receipt into an in-toto Statement carrying a SLSA provenance predicate, and
// wraps it in a DSSE envelope (the Dead Simple Signing Envelope that Sigstore/cosign and the
// in-toto tooling verify). Zero-dependency ed25519 via node:crypto — interoperable, not bespoke.
import { sign as edSign, verify as edVerify } from "node:crypto";

export const IN_TOTO_STATEMENT = "https://in-toto.io/Statement/v1";
export const SLSA_PROVENANCE = "https://slsa.dev/provenance/v1";
const PAYLOAD_TYPE = "application/vnd.in-toto+json";

/** Build an in-toto v1 Statement with a SLSA provenance predicate from a Beacon receipt. */
export function toInTotoStatement(receipt, { subjectName = "evidence" } = {}) {
  return {
    _type: IN_TOTO_STATEMENT,
    subject: [{ name: subjectName, digest: { sha256: receipt.evidenceHash } }],
    predicateType: SLSA_PROVENANCE,
    predicate: {
      buildDefinition: {
        buildType: "https://aigovops.org/beacon/v1",
        externalParameters: { gate: receipt.gate ?? "beacon" },
      },
      runDetails: {
        builder: { id: "https://aigovops.org/beacon" },
        metadata: { invocationId: receipt.evidenceHash, startedOn: receipt.issuedAt ?? null },
      },
    },
  };
}

// DSSE Pre-Authentication Encoding (PAE): "DSSEv1 <len type> <type> <len body> <body>".
function pae(payloadType, payload) {
  const head = Buffer.from(`DSSEv1 ${payloadType.length} ${payloadType} ${payload.length} `, "utf8");
  return Buffer.concat([head, payload]);
}

/** Sign a statement into a DSSE envelope with an ed25519 private key (PEM). */
export function toDsseEnvelope(statement, privateKeyPem) {
  const payload = Buffer.from(JSON.stringify(statement), "utf8");
  const sig = edSign(null, pae(PAYLOAD_TYPE, payload), privateKeyPem).toString("base64");
  return { payloadType: PAYLOAD_TYPE, payload: payload.toString("base64"), signatures: [{ sig }] };
}

/** Verify a DSSE envelope against an ed25519 public key (PEM). */
export function verifyDsse(envelope, publicKeyPem) {
  try {
    const payload = Buffer.from(envelope.payload, "base64");
    return (envelope.signatures || []).some((s) =>
      edVerify(null, pae(envelope.payloadType, payload), publicKeyPem, Buffer.from(s.sig, "base64")),
    );
  } catch {
    return false;
  }
}

/** Convenience: receipt → signed DSSE attestation in one call. */
export function attest(receipt, privateKeyPem, opts = {}) {
  return toDsseEnvelope(toInTotoStatement(receipt, opts), privateKeyPem);
}
