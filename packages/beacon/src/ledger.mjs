// Beacon v-next (M6) — the hash-chained, append-only ledger.
//
// Each entry links to the previous via a SHA-256 hash over its canonical form, so any edit,
// reorder, or deletion anywhere in the history is detectable by re-walking the chain. Pure and
// zero-dependency; serialize to NDJSON for durable storage. An optional `sink` (e.g. the
// OpenSearch adapter) receives every appended entry for searchable evidence.
import { createHash } from "node:crypto";
import { canonicalize } from "./sign.mjs";

const hash = (obj) => createHash("sha256").update(canonicalize(obj)).digest("hex");

export class Ledger {
  /** @param {{entries?: Array, sink?: {index(entry):Promise}}} [opts] */
  constructor({ entries = [], sink } = {}) {
    this.entries = entries;
    this.sink = sink;
  }

  get head() {
    return this.entries.length ? this.entries[this.entries.length - 1].hash : null;
  }

  /** Append a (signed) receipt, linking it to the prior entry. Returns the new entry. */
  async append(receipt) {
    const body = { seq: this.entries.length, prev: this.head, receipt };
    const entry = { ...body, hash: hash(body) };
    this.entries.push(entry);
    if (this.sink) await this.sink.index(entry);
    return entry;
  }

  /** Re-walk the chain; returns { ok } or the first break with its index + reason. */
  verifyChain() {
    let prev = null;
    for (let i = 0; i < this.entries.length; i++) {
      const e = this.entries[i];
      if (e.seq !== i) return { ok: false, brokenAt: i, reason: "seq" };
      if (e.prev !== prev) return { ok: false, brokenAt: i, reason: "prev" };
      if (e.hash !== hash({ seq: e.seq, prev: e.prev, receipt: e.receipt })) return { ok: false, brokenAt: i, reason: "hash" };
      prev = e.hash;
    }
    return { ok: true, length: this.entries.length };
  }

  toNDJSON() {
    return this.entries.map((e) => JSON.stringify(e)).join("\n");
  }

  static fromNDJSON(text) {
    return new Ledger({ entries: String(text).split("\n").filter(Boolean).map((l) => JSON.parse(l)) });
  }
}
