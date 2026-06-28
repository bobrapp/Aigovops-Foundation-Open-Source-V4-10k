// M18 — ship ledger entries to Fluentd / Fluent Bit for fan-out to a SIEM or cold storage.
// METADATA ONLY: seq, chain hashes, gate id, evidence hash, timestamp — never a payload, never PII.
// Closes the ROADMAP Beacon "log shipping" gap.

/** Project a ledger entry to a safe Fluentd record. Drops everything that could carry content. */
export function toFluentdRecord(entry, { tag = "aigovops.ledger" } = {}) {
  const wrap = entry.receipt || {};
  const r = wrap.receipt || wrap; // unwrap M16's { actor, action, receipt } record
  return {
    tag,
    time: Math.floor((r.issuedAt || 0) / 1000) || 0,
    record: { seq: entry.seq, hash: entry.hash, prev: entry.prev, gate: r.gate, evidenceHash: r.evidenceHash, issuedAt: r.issuedAt },
  };
}

export class FluentdSink {
  constructor({ endpoint = process.env.AIGOVOPS_FLUENTD_URL, tag = "aigovops.ledger", transport } = {}) {
    this.endpoint = endpoint; this.tag = tag;
    this.transport = transport || (async ({ method, url, headers, body }) => {
      const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
      return { status: res.status };
    });
  }
  usable() { return !!this.endpoint; }
  async ship(entry) {
    if (!this.usable()) return { ok: false, skipped: "no endpoint" };
    const rec = toFluentdRecord(entry, { tag: this.tag });
    const { status } = await this.transport({ method: "POST", url: `${this.endpoint}/${this.tag}`, headers: { "content-type": "application/json" }, body: rec.record });
    if (status >= 300) throw new Error(`Fluentd ship ${status}`);
    return { ok: true, seq: entry.seq };
  }
}
