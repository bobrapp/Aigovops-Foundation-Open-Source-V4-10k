// Tier-1 agent: Audit-Bundler.
// Reads the oversight ledger and produces the auditor's report (the GI book's Appendix-D shape):
// totals, a breakdown by verdict and by cited regulation, signed for tamper-evidence.
import { signEvidence } from "../../beacon/src/index.mjs";

/**
 * @param {{ledger?, records?, beacon?, at?}} opts  pass a Ledger or a raw records[]
 * @returns {{report, receipt, publicKey, markdown}}
 */
export function bundle({ ledger, records, beacon, at } = {}) {
  const recs = records || ledger?.records || [];

  const byStatus = recs.reduce((m, r) => ((m[r.status] = (m[r.status] || 0) + 1), m), {});
  const byCitation = {};
  for (const r of recs) for (const c of r.citations || []) byCitation[c] = (byCitation[c] || 0) + 1;

  const report = { schema: "aigovops.audit/1", at: at ?? null, total: recs.length, byStatus, byCitation };
  const signed = signEvidence({
    configured: true,
    payload: report,
    privateKey: beacon?.privateKey,
    publicKey: beacon?.publicKey,
    issuedAt: at,
  });

  return { report, receipt: signed.receipt, publicKey: signed.publicKey, markdown: render(report) };
}

function render(report) {
  const lines = [`# Audit report`, ``, `Records: ${report.total}`, ``, `## By verdict`];
  for (const [k, v] of Object.entries(report.byStatus)) lines.push(`- ${k}: ${v}`);
  lines.push(``, `## By regulation`);
  const cites = Object.entries(report.byCitation).sort((a, b) => b[1] - a[1]);
  if (!cites.length) lines.push(`- (none cited)`);
  for (const [c, n] of cites) lines.push(`- ${c}: ${n}`);
  return lines.join("\n");
}
