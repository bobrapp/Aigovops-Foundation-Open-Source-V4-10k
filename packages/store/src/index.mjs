// M9 — durable persistence behind one KVStore contract.
//
// The ledger, baselines, policy versions, and sessions all need to survive a restart. One small
// interface — get/set/del/list/append — with a zero-dep Memory impl (lab) and a File impl
// (node:fs, JSON). Postgres or OpenSearch slot in behind the same methods for fleet/enclave.
//
//   get(key)        → value | null
//   set(key, value) → value
//   del(key)        → boolean
//   list(prefix?)   → key[]
//   append(key, v)  → new length   (value is an array)
import { readFileSync, writeFileSync, existsSync } from "node:fs";

export class MemoryStore {
  constructor() { this.m = new Map(); }
  async get(k) { return this.m.has(k) ? this.m.get(k) : null; }
  async set(k, v) { this.m.set(k, v); return v; }
  async del(k) { return this.m.delete(k); }
  async list(prefix = "") { return [...this.m.keys()].filter((k) => k.startsWith(prefix)); }
  async append(k, v) { const a = this.m.get(k) || []; a.push(v); this.m.set(k, a); return a.length; }
}

export class FileStore {
  constructor({ path }) {
    this.path = path;
    this.m = existsSync(path) ? new Map(Object.entries(JSON.parse(readFileSync(path, "utf8")))) : new Map();
  }
  _flush() { writeFileSync(this.path, JSON.stringify(Object.fromEntries(this.m))); }
  async get(k) { return this.m.has(k) ? this.m.get(k) : null; }
  async set(k, v) { this.m.set(k, v); this._flush(); return v; }
  async del(k) { const r = this.m.delete(k); this._flush(); return r; }
  async list(prefix = "") { return [...this.m.keys()].filter((k) => k.startsWith(prefix)); }
  async append(k, v) { const a = this.m.get(k) || []; a.push(v); this.m.set(k, a); this._flush(); return a.length; }
}

/** A view of a store scoped to a `ns:` prefix — one store, many namespaces (ledger/policies/…). */
export function namespaced(store, ns) {
  const key = (k) => `${ns}:${k}`;
  const strip = (k) => k.slice(ns.length + 1);
  return {
    get: (k) => store.get(key(k)),
    set: (k, v) => store.set(key(k), v),
    del: (k) => store.del(key(k)),
    append: (k, v) => store.append(key(k), v),
    list: async (p = "") => (await store.list(key(p))).map(strip),
  };
}
