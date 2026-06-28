// Beacon v-next (M6) — a key ring with rotation.
// Sign with the current key; verify against the current key OR any retired one, so receipts
// signed before a rotation still verify. Keys are ed25519 PEM pairs from sign.mjs.
import { generateKeypair, signReceipt, verifyReceipt } from "./sign.mjs";

export class KeyRing {
  constructor({ current = null, retired = [] } = {}) {
    this.current = current;
    this.retired = retired;
  }

  /** Mint a new current key, retiring the previous one. */
  rotate() {
    if (this.current) this.retired.push(this.current);
    this.current = generateKeypair();
    return this.current;
  }

  sign(evidence, meta = {}) {
    if (!this.current) this.rotate();
    return signReceipt(evidence, this.current.privateKey, meta);
  }

  /** Verify against the current key and every retired key. */
  verify(receipt) {
    return [this.current, ...this.retired].some((k) => k && verifyReceipt(receipt, k.publicKey));
  }

  /** Public keys (current first) — publish these so anyone can verify offline. */
  publicKeys() {
    return [this.current, ...this.retired].filter(Boolean).map((k) => k.publicKey);
  }
}
