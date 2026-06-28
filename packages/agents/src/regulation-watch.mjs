// Tier-1 agent: Regulation-Watch.
// Runs on a schedule, refreshes the requirement set (from the built-in corpus or a live feed),
// diffs it against a prior snapshot, and reports what changed — new requirements, retired ones,
// or a citation that moved.
import { REQUIREMENTS } from "../../corpus/src/index.mjs";

/** A small, storable fingerprint of the corpus: each requirement's id + citation. */
export function snapshot() {
  return REQUIREMENTS.map((r) => ({ id: r.id, citation: r.citation }));
}

/** Default feed reader: GET a JSON array of {id, citation} with a timeout. */
export async function fetchFeed(url, { timeoutMs = 8000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { accept: "application/json" }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`feed ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("feed must be a JSON array of {id, citation}");
    return data.map((r) => ({ id: r.id, citation: r.citation }));
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Pull the current requirement set from a live feed, then diff against the prior snapshot.
 * @param {{previous?, url, transport?}} opts  transport(url) → [{id,citation}] (injectable for tests)
 */
export async function watchFeed({ previous, url, transport = fetchFeed } = {}) {
  const current = await transport(url);
  return watch({ previous, current });
}

/**
 * @param {{previous?: Array<{id,citation}>, current?: Array<{id,citation}>}} [opts]
 *   previous = the last snapshot (omit for a baseline run); current = the live set (defaults to the corpus)
 * @returns {{baseline, added[], removed[], changed[], total, digest}}
 */
export function watch({ previous, current } = {}) {
  const cur = current || snapshot();
  const prevMap = new Map((previous || []).map((r) => [r.id, r.citation]));
  const curMap = new Map(cur.map((r) => [r.id, r.citation]));

  const added = cur.filter((r) => !prevMap.has(r.id)).map((r) => r.id);
  const removed = [...prevMap.keys()].filter((id) => !curMap.has(id));
  const changed = cur
    .filter((r) => prevMap.has(r.id) && prevMap.get(r.id) !== r.citation)
    .map((r) => ({ id: r.id, from: prevMap.get(r.id), to: r.citation }));

  const baseline = !previous;
  return { baseline, added, removed, changed, total: cur.length, digest: digest({ baseline, added, removed, changed, total: cur.length }) };
}

function digest({ baseline, added, removed, changed, total }) {
  if (baseline) return `Regulation-Watch baseline established: ${total} requirements tracked.`;
  if (!added.length && !removed.length && !changed.length) return "Regulation-Watch: no changes since last run.";
  const lines = ["Regulation-Watch: changes detected —"];
  if (added.length) lines.push(`  + ${added.length} new: ${added.join(", ")}`);
  if (removed.length) lines.push(`  - ${removed.length} retired: ${removed.join(", ")}`);
  for (const c of changed) lines.push(`  ~ ${c.id}: ${c.from} → ${c.to}`);
  return lines.join("\n");
}
