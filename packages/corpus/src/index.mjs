// The regulatory corpus — a structured, citeable index of AI-governance requirements.
//
// Built only from PRIMARY PUBLIC SOURCES: each entry pairs an ORIGINAL one-line paraphrase
// (our own words) with a citation to the public regulation or standard (an article number or
// published-standard reference). No third-party copyrighted text is reproduced. It is the
// knowledge base the Policy-Improver reasons over. SEED corpus — representative, not
// exhaustive; extend REQUIREMENTS over time. Each entry is independently verifiable against
// its primary source.
//
// requirement = {
//   id, framework, citation, title, summary,
//   keywords[]       — phrases whose presence in a policy signals coverage
//   applicability { jurisdictions[], sectors[], dataTypes[], riskTiers[] }   ("*" = any)
//   suggestedClause  — plain-language clause to add when missing
//   suggestedGate    — candidate Umbrella rule { path, op, value } (the M1→M2 hand-off), or null
// }

export const REQUIREMENTS = [
  {
    id: "eu-ai-act/risk-management",
    framework: "EU AI Act", citation: "Regulation (EU) 2024/1689, Art. 9",
    title: "Risk management system for high-risk AI",
    summary: "Establish, document, and maintain a continuous risk management system across the lifecycle.",
    keywords: ["risk management", "risk assessment", "lifecycle", "residual risk"],
    applicability: { jurisdictions: ["EU", "*"], sectors: ["*"], dataTypes: ["*"], riskTiers: ["high"] },
    suggestedClause: "Maintain a documented, continuously-updated risk management process covering the full AI lifecycle, with residual-risk sign-off.",
    suggestedGate: { path: "riskAssessment.completed", op: "equals", value: true },
  },
  {
    id: "eu-ai-act/data-governance",
    framework: "EU AI Act", citation: "Regulation (EU) 2024/1689, Art. 10",
    title: "Data and data governance",
    summary: "Training, validation, and testing data must meet quality criteria and be examined for bias.",
    keywords: ["data governance", "data quality", "training data", "bias", "representative"],
    applicability: { jurisdictions: ["EU", "*"], sectors: ["*"], dataTypes: ["*"], riskTiers: ["high"] },
    suggestedClause: "Document dataset provenance, quality checks, and bias examination for all training/validation/test data.",
    suggestedGate: { path: "data.biasExamined", op: "equals", value: true },
  },
  {
    id: "eu-ai-act/record-keeping",
    framework: "EU AI Act", citation: "Regulation (EU) 2024/1689, Art. 12",
    title: "Record-keeping and logging",
    summary: "High-risk systems must automatically record events (logs) over their lifetime for traceability.",
    keywords: ["logging", "record-keeping", "audit log", "traceability", "logs"],
    applicability: { jurisdictions: ["EU", "*"], sectors: ["*"], dataTypes: ["*"], riskTiers: ["high"] },
    suggestedClause: "Automatically log system events with sufficient detail for traceability and post-hoc audit.",
    suggestedGate: { path: "logging.enabled", op: "equals", value: true },
  },
  {
    id: "eu-ai-act/transparency",
    framework: "EU AI Act", citation: "Regulation (EU) 2024/1689, Art. 13 & Art. 50",
    title: "Transparency and provision of information",
    summary: "Users must be informed they are interacting with AI, and given instructions for use.",
    keywords: ["transparency", "disclosure", "inform users", "ai-generated", "instructions for use"],
    applicability: { jurisdictions: ["EU", "*"], sectors: ["*"], dataTypes: ["*"], riskTiers: ["high", "limited"] },
    suggestedClause: "Disclose to end-users that they are interacting with an AI system and label AI-generated content.",
    suggestedGate: { path: "transparency.userNotified", op: "equals", value: true },
  },
  {
    id: "eu-ai-act/human-oversight",
    framework: "EU AI Act", citation: "Regulation (EU) 2024/1689, Art. 14",
    title: "Human oversight",
    summary: "High-risk AI must be overseeable by natural persons, with the ability to intervene or halt.",
    keywords: ["human oversight", "human review", "human-in-the-loop", "override", "intervene", "kill switch"],
    applicability: { jurisdictions: ["EU", "*"], sectors: ["*"], dataTypes: ["*"], riskTiers: ["high"] },
    suggestedClause: "Designate human reviewers empowered to override or stop the system; record every intervention.",
    suggestedGate: { path: "humanOversight.enabled", op: "equals", value: true },
  },
  {
    id: "gdpr/lawful-basis",
    framework: "GDPR", citation: "Regulation (EU) 2016/679, Art. 6",
    title: "Lawful basis for processing",
    summary: "Personal-data processing requires a documented lawful basis (consent, contract, legitimate interest, …).",
    keywords: ["lawful basis", "consent", "legitimate interest", "legal basis", "data subject"],
    applicability: { jurisdictions: ["EU", "*"], sectors: ["*"], dataTypes: ["personal"], riskTiers: ["*"] },
    suggestedClause: "Record the lawful basis for every category of personal data processed by the system.",
    suggestedGate: { path: "privacy.lawfulBasis", op: "required" },
  },
  {
    id: "gdpr/dpia",
    framework: "GDPR", citation: "Regulation (EU) 2016/679, Art. 35",
    title: "Data Protection Impact Assessment",
    summary: "High-risk processing requires a DPIA before deployment.",
    keywords: ["dpia", "data protection impact assessment", "impact assessment"],
    applicability: { jurisdictions: ["EU", "*"], sectors: ["*"], dataTypes: ["personal"], riskTiers: ["high"] },
    suggestedClause: "Complete and document a DPIA before deploying processing likely to result in high risk to individuals.",
    suggestedGate: { path: "privacy.dpiaCompleted", op: "equals", value: true },
  },
  {
    id: "gdpr/automated-decisions",
    framework: "GDPR", citation: "Regulation (EU) 2016/679, Art. 22",
    title: "Automated decision-making safeguards",
    summary: "Solely automated decisions with legal/significant effects need safeguards and a right to human review.",
    keywords: ["automated decision", "right to explanation", "human review", "contest", "profiling"],
    applicability: { jurisdictions: ["EU", "*"], sectors: ["*"], dataTypes: ["personal"], riskTiers: ["high"] },
    suggestedClause: "Provide a route to obtain human review of, and to contest, any solely-automated decision with significant effect.",
    suggestedGate: { path: "humanOversight.enabled", op: "equals", value: true },
  },
  {
    id: "gdpr/data-minimization",
    framework: "GDPR", citation: "Regulation (EU) 2016/679, Art. 5(1)(c)",
    title: "Data minimization",
    summary: "Process only personal data that is adequate, relevant, and limited to what is necessary.",
    keywords: ["data minimization", "minimisation", "necessary", "retention", "purpose limitation"],
    applicability: { jurisdictions: ["EU", "*"], sectors: ["*"], dataTypes: ["personal"], riskTiers: ["*"] },
    suggestedClause: "Collect and retain only the minimum personal data necessary for the stated purpose; set retention limits.",
    suggestedGate: { path: "privacy.retentionDays", op: "lessThan", value: 365 },
  },
  {
    id: "nist-ai-rmf/govern-measure",
    framework: "NIST AI RMF", citation: "NIST AI 100-1 (Govern · Map · Measure · Manage)",
    title: "Govern and measure trustworthiness",
    summary: "Operate the four RMF functions; measure validity, reliability, and bias of AI outcomes.",
    keywords: ["nist", "risk management framework", "govern", "measure", "trustworthy", "reliability"],
    applicability: { jurisdictions: ["US", "*"], sectors: ["*"], dataTypes: ["*"], riskTiers: ["*"] },
    suggestedClause: "Adopt the NIST AI RMF functions (Govern/Map/Measure/Manage) and record measured trustworthiness metrics.",
    suggestedGate: null,
  },
  {
    id: "iso-42001/aims",
    framework: "ISO/IEC 42001", citation: "ISO/IEC 42001:2023",
    title: "AI management system",
    summary: "Establish a certifiable AI management system: policy, roles, objectives, and continual improvement.",
    keywords: ["management system", "iso 42001", "continual improvement", "roles and responsibilities", "objectives"],
    applicability: { jurisdictions: ["*"], sectors: ["*"], dataTypes: ["*"], riskTiers: ["*"] },
    suggestedClause: "Define an AI management system with assigned roles, measurable objectives, and a continual-improvement cycle.",
    suggestedGate: null,
  },
  {
    id: "ferpa/education-records",
    framework: "FERPA", citation: "20 U.S.C. § 1232g; 34 CFR Part 99",
    title: "Consent for disclosure of education records",
    summary: "Disclosure of personally identifiable information from education records generally requires consent.",
    keywords: ["ferpa", "education records", "student", "consent", "directory information"],
    applicability: { jurisdictions: ["US", "*"], sectors: ["education"], dataTypes: ["personal", "children"], riskTiers: ["*"] },
    suggestedClause: "Obtain consent before disclosing PII from student education records; restrict third-party model access.",
    suggestedGate: { path: "privacy.studentConsent", op: "equals", value: true },
  },
  {
    id: "hipaa/technical-safeguards",
    framework: "HIPAA", citation: "45 CFR § 164.312",
    title: "Technical safeguards for PHI",
    summary: "Protected health information requires access control, audit controls, integrity, and transmission security.",
    keywords: ["hipaa", "phi", "protected health information", "access control", "encryption", "audit controls"],
    applicability: { jurisdictions: ["US", "*"], sectors: ["healthcare"], dataTypes: ["health", "personal"], riskTiers: ["*"] },
    suggestedClause: "Apply access control, audit controls, integrity checks, and encryption in transit for all PHI.",
    suggestedGate: { path: "security.encryptionInTransit", op: "equals", value: true },
  },
  {
    id: "colorado-ai-act/discrimination",
    framework: "Colorado AI Act", citation: "Colorado SB 24-205",
    title: "Duty of care against algorithmic discrimination",
    summary: "Deployers of high-risk AI must use reasonable care to avoid algorithmic discrimination and notify consumers.",
    keywords: ["algorithmic discrimination", "consumer notice", "reasonable care", "impact assessment", "high-risk"],
    applicability: { jurisdictions: ["US", "US-CO", "*"], sectors: ["*"], dataTypes: ["personal"], riskTiers: ["high"] },
    suggestedClause: "Use reasonable care to prevent algorithmic discrimination; notify consumers when AI makes a consequential decision.",
    suggestedGate: { path: "fairness.tested", op: "equals", value: true },
  },
  {
    id: "nyc-ll144/bias-audit",
    framework: "NYC Local Law 144", citation: "NYC Local Law 144 (2021)",
    title: "Bias audit for automated employment tools",
    summary: "Automated employment decision tools must pass an independent annual bias audit, published publicly.",
    keywords: ["bias audit", "employment", "hiring", "adverse impact", "independent audit"],
    applicability: { jurisdictions: ["US", "US-NYC", "*"], sectors: ["employment", "hr"], dataTypes: ["personal"], riskTiers: ["*"] },
    suggestedClause: "Commission an independent annual bias audit of any automated employment decision tool and publish the results.",
    suggestedGate: { path: "fairness.auditDate", op: "required" },
  },
  {
    id: "owasp-llm/prompt-injection",
    framework: "OWASP LLM Top 10", citation: "OWASP LLM01:2025 — Prompt Injection",
    title: "Prompt-injection defenses",
    summary: "LLM applications must defend against prompt injection that overrides instructions or exfiltrates data.",
    keywords: ["prompt injection", "jailbreak", "input validation", "guardrail", "system prompt"],
    applicability: { jurisdictions: ["*"], sectors: ["*"], dataTypes: ["*"], riskTiers: ["*"] },
    suggestedClause: "Validate and constrain model inputs/outputs; segregate system instructions; test against prompt-injection.",
    suggestedGate: { path: "security.promptInjectionTested", op: "equals", value: true },
  },
];

const matches = (list, value) =>
  !value || !Array.isArray(list) || list.includes("*") || list.includes(value);

const overlaps = (list, values) =>
  !values?.length || !Array.isArray(list) || list.includes("*") || values.some((v) => list.includes(v));

/**
 * Select the requirements applicable to a governance context.
 * @param {{jurisdiction?:string, sector?:string, dataTypes?:string[], riskTier?:string}} ctx
 */
export function select(ctx = {}) {
  return REQUIREMENTS.filter((r) => {
    const a = r.applicability;
    return (
      matches(a.jurisdictions, ctx.jurisdiction) &&
      matches(a.sectors, ctx.sector) &&
      matches(a.riskTiers, ctx.riskTier) &&
      overlaps(a.dataTypes, ctx.dataTypes)
    );
  });
}

/** Keyword search across the corpus. */
export function search(term) {
  const t = String(term).toLowerCase();
  return REQUIREMENTS.filter(
    (r) => r.title.toLowerCase().includes(t) || r.keywords.some((k) => k.includes(t)) || r.framework.toLowerCase().includes(t),
  );
}

/** All distinct frameworks in the corpus. */
export function frameworks() {
  return [...new Set(REQUIREMENTS.map((r) => r.framework))];
}
