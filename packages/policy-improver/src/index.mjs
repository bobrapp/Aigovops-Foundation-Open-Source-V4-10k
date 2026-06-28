// Policy-Improver (M1) — the wedge.
//
// A policy author brings a WRITTEN POLICY (prose). This engine maps it against the
// applicable regulatory corpus, scores how well each requirement is covered, and returns
// a cited gap analysis with suggested clauses and candidate gates (the hand-off to M2).
//
// Deterministic and testable: coverage is measured by keyword presence, citations come
// straight from the corpus — nothing is invented. A conversational LLM layer (a Jeeves
// sub-agent) can wrap improve() for natural-language polish, but the gaps and citations
// it presents are produced here, verifiably.
import { select } from "../../corpus/src/index.mjs";

const COVERED = 0.5; // ≥ half the requirement's keywords present → covered

const norm = (s) => String(s || "").toLowerCase();

function coverage(policyText, requirement) {
  const hay = norm(policyText);
  const hits = requirement.keywords.filter((k) => hay.includes(norm(k)));
  const ratio = requirement.keywords.length ? hits.length / requirement.keywords.length : 0;
  const status = ratio >= COVERED ? "covered" : ratio > 0 ? "partial" : "missing";
  return { ratio, hits, status };
}

/**
 * @param {string} policyText                       the written policy (prose)
 * @param {{jurisdiction?,sector?,dataTypes?,riskTier?}} context   governance context
 * @returns {{context, coverageScore, applicableCount, strengths[], gaps[], suggestedGates[]}}
 */
export function improve(policyText, context = {}) {
  const applicable = select(context);
  const strengths = [];
  const gaps = [];

  for (const r of applicable) {
    const c = coverage(policyText, r);
    const entry = {
      id: r.id, framework: r.framework, citation: r.citation, title: r.title,
      status: c.status, matched: c.hits,
    };
    if (c.status === "covered") {
      strengths.push(entry);
    } else {
      gaps.push({
        ...entry,
        why: c.status === "partial"
          ? `Mentioned but thin — only matched: ${c.hits.join(", ") || "—"}. ${r.summary}`
          : `Not addressed. ${r.summary}`,
        suggestedClause: r.suggestedClause,
        suggestedGate: r.suggestedGate, // candidate Umbrella rule for M2
      });
    }
  }

  // Gaps that map cleanly to a gate are the developer's M2 starting set.
  const suggestedGates = gaps
    .filter((g) => g.suggestedGate)
    .map((g) => ({ from: g.id, framework: g.framework, title: g.title, citation: g.citation, mitigation: g.suggestedClause, rule: g.suggestedGate }));

  return {
    context,
    applicableCount: applicable.length,
    coverageScore: applicable.length ? +(strengths.length / applicable.length).toFixed(2) : 1,
    strengths,
    gaps,
    suggestedGates,
  };
}

/** Render an improvement report as a cited Markdown brief for the policy author. */
export function toMarkdown(report) {
  const pct = Math.round(report.coverageScore * 100);
  const lines = [
    `# Policy improvement report`,
    ``,
    `**Context:** ${JSON.stringify(report.context)}`,
    `**Coverage:** ${report.strengths.length}/${report.applicableCount} applicable requirements (${pct}%)`,
    ``,
    `## Gaps to close (${report.gaps.length})`,
  ];
  for (const g of report.gaps) {
    lines.push(
      ``,
      `### ${g.framework} — ${g.title}  \`${g.status}\``,
      `*${g.citation}*`,
      ``,
      `${g.why}`,
      ``,
      `**Add:** ${g.suggestedClause}`,
    );
    if (g.suggestedGate) lines.push(`**Candidate gate:** \`${JSON.stringify(g.suggestedGate)}\``);
  }
  lines.push(``, `## Already covered (${report.strengths.length})`);
  for (const s of report.strengths) lines.push(`- ${s.framework} — ${s.title} *(${s.citation})*`);
  return lines.join("\n");
}

// Demo: a thin education policy missing most of what FERPA/GDPR/EU-AI-Act require.
if (import.meta.url === `file://${process.argv[1]}`) {
  const policy = `Our school uses an AI tutor. We log usage and tell students it is AI.
                  Teachers can review and override its suggestions.`;
  const report = improve(policy, { sector: "education", jurisdiction: "EU", dataTypes: ["personal", "children"], riskTier: "high" });
  console.log(toMarkdown(report));
}
