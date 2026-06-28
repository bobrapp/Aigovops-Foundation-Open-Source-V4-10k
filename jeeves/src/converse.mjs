// Jeeves' conversational policy-improver.
//
// The LLM does natural-language work ONLY: it reads free text to infer the governance
// context, and it phrases the reply. The FACTS — which requirements apply, the gaps, the
// citations — come from the deterministic policy-improver. The model is told to ground its
// reply in those facts and invent nothing. That's how a conversational surface stays honest.
import { improve } from "../../packages/policy-improver/src/index.mjs";
import { HeuristicLLM } from "./llm.mjs";

const GROUNDED_SYSTEM =
  "You are Jeeves, an AI-governance assistant. Summarize the verified policy gaps below for a " +
  "non-technical policy author: warm, plain, and brief. Cite ONLY the citations provided. Do not " +
  "invent regulations, articles, or requirements that are not in the list. End by offering to draft the gates.";

function groundedBrief(report) {
  const pct = Math.round(report.coverageScore * 100);
  const lines = [
    `Coverage: ${report.strengths.length}/${report.applicableCount} applicable requirements (${pct}%).`,
    report.gaps.length ? `Top gaps to close:` : `No gaps — the policy covers the applicable requirements.`,
  ];
  for (const g of report.gaps.slice(0, 6)) lines.push(`- ${g.framework} (${g.citation}): ${g.suggestedClause}`);
  if (report.gaps.length > 6) lines.push(`- …and ${report.gaps.length - 6} more.`);
  return lines.join("\n");
}

/**
 * @param {string} utterance  free-text policy or question
 * @param {{llm?, context?}} [opts]
 * @returns {{context, report, reply}}
 */
export async function converse(utterance, { llm = new HeuristicLLM(), context } = {}) {
  const ctx = context || (await llm.extractContext(utterance));
  const report = improve(utterance, ctx);
  const brief = groundedBrief(report);
  const reply = await llm.narrate({ system: GROUNDED_SYSTEM, prompt: brief });
  return { context: ctx, report, reply };
}
