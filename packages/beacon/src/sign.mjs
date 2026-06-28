// Beacon evidence signing — zero-dependency, node:crypto only.
//
// An evidence receipt is a small, signed JSON proof that a specific piece of
// evidence existed and passed its gate at a moment in time. Anyone holding the
// public key can verify it offline — no network, no trust in our code.
import { generateKeyPairSync, sign as edSign, verify as edVerify, createHash } from "node:crypto";

export const RECEIPT_SCHEMA = "aigovops.beacon.receipt/1";

/** Deterministic JSON: object keys sorted, so the same value always hashes the same. */
export function canonicalize(value) {
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  if (value && typeof value === "object") {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((k) => JSON.stringify(k) + ":" + canonicalize(value[k]))
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(value ?? null);
}

/** SHA-256 over the canonical form of the evidence. */
export function hashEvidence(evidence) {
  return createHash("sha256").update(canonicalize(evidence)).digest("hex");
}

/** Mint an ed25519 keypair as PEM strings (for demos/tests; prod keys come from a broker). */
export function generateKeypair() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    publicKey: publicKey.export({ type: "spki", format: "pem" }),
    privateKey: privateKey.export({ type: "pkcs8", format: "pem" }),
  };
}

/**
 * Sign a receipt over a piece of evidence.
 * @param {*} evidence            anything JSON-serializable
 * @param {string} privateKeyPem  ed25519 private key (PEM)
 * @param {{issuedAt?: string, gate?: string}} [meta]
 * @returns {object} the signed receipt
 */
export function signReceipt(evidence, privateKeyPem, meta = {}) {
  const body = {
    schema: RECEIPT_SCHEMA,
    algorithm: "ed25519",
    gate: meta.gate ?? "beacon",
    issuedAt: meta.issuedAt ?? new Date().toISOString(),
    evidenceHash: hashEvidence(evidence),
  };
  const signature = edSign(null, Buffer.from(canonicalize(body)), privateKeyPem).toString("base64");
  return { ...body, signature };
}

/**
 * Verify a receipt's signature against a public key.
 * @returns {boolean} true iff the signature is valid for this exact receipt body
 */
export function verifyReceipt(receipt, publicKeyPem) {
  if (!receipt || typeof receipt.signature !== "string") return false;
  const { signature, ...body } = receipt;
  try {
    return edVerify(null, Buffer.from(canonicalize(body)), publicKeyPem, Buffer.from(signature, "base64"));
  } catch {
    return false;
  }
}
