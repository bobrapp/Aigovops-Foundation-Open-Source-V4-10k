// Tier-1 agent: Regulation-Watch.
// Runs on a schedule, diffs the regulatory corpus against a prior snapshot, and reports what
// changed — new requirements, retired ones, or a citation that moved. In production a feed
// scraper would refresh the corpus first; here the diff over @aigovops/corpus is the core.
import { REQUIREMENTS } from "../../corpus/src/index.mjs";

/** A small, storable fingerprint of the corpus: each requirement's id + citation. */
export function snapshot() {
  return REQUIREMENTS.map((r) => ({ id: r.id, citation: r.citation }));
}

/**
 * @param {{previous?: Array<{id,citation}>}} [opts]  the last snapshot (omit for a baseline run)
 * @returns {{baseline, added[], removed[], changed[], total, digest}}
 */
export function watch({ previous } = {}) {
  const cur = snapshot();
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
