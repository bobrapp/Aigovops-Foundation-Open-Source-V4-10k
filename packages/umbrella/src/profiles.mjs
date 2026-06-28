// Umbrella v-next (M8) — framework-profile compilation.
//
// Turns the regulatory corpus (M1) into RUNNABLE per-framework policies: for a given framework
// and context, collect the requirements that map to a gate and compile them into one Umbrella
// policy, carrying every controlling citation. This is the bridge from "what the law requires"
// to "the gate that enforces it".
import { select } from "../../corpus/src/index.mjs";
import { compile } from "./compile.mjs";

/**
 * @param {string} framework  e.g. "EU AI Act", "GDPR", "HIPAA"
 * @param {{jurisdiction?, sector?, dataTypes?, riskTier?}} [context]
 * @returns {{framework, policy, citations}}  policy is guaranteed to compile
 */
export function compileFrameworkProfile(framework, context = {}) {
  const reqs = select(context).filter((r) => r.framework === framework && r.suggestedGate);
  if (!reqs.length) throw new Error(`no gateable "${framework}" requirements in this context`);

  const rules = [];
  const citations = {};
  const seen = new Set();
  for (const r of reqs) {
    const g = r.suggestedGate;
    (citations[g.path] ??= []);
    if (!citations[g.path].includes(r.citation)) citations[g.path].push(r.citation);
    const key = JSON.stringify(g);
    if (!seen.has(key)) {
      seen.add(key);
      rules.push({ ...g, message: r.suggestedClause });
    }
  }

  const policy = { name: `${framework} profile`, rules };
  compile(policy); // guarantee runnable
  return { framework, policy, citations };
}

/** Frameworks that have at least one gateable requirement in this context. */
export function availableProfiles(context = {}) {
  return [...new Set(select(context).filter((r) => r.suggestedGate).map((r) => r.framework))];
}
