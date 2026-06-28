import { test } from "node:test";
import assert from "node:assert/strict";
import { REQUIREMENTS, select, search, frameworks } from "../src/index.mjs";

test("every requirement is well-formed and citeable", () => {
  for (const r of REQUIREMENTS) {
    assert.ok(r.id && r.framework && r.citation && r.title, `incomplete: ${r.id}`);
    assert.ok(Array.isArray(r.keywords) && r.keywords.length > 0, `no keywords: ${r.id}`);
    assert.ok(r.applicability && Array.isArray(r.applicability.jurisdictions), `no applicability: ${r.id}`);
  }
});

test("select filters by sector — FERPA appears for education, not for healthcare", () => {
  const edu = select({ sector: "education", dataTypes: ["children"] }).map((r) => r.id);
  assert.ok(edu.includes("ferpa/education-records"));
  const health = select({ sector: "healthcare", dataTypes: ["health"] }).map((r) => r.id);
  assert.ok(!health.includes("ferpa/education-records"));
  assert.ok(health.includes("hipaa/technical-safeguards"));
});

test("select filters by risk tier — DPIA only for high-risk personal data", () => {
  const high = select({ jurisdiction: "EU", dataTypes: ["personal"], riskTier: "high" }).map((r) => r.id);
  assert.ok(high.includes("gdpr/dpia"));
  const low = select({ jurisdiction: "EU", dataTypes: ["personal"], riskTier: "minimal" }).map((r) => r.id);
  assert.ok(!low.includes("gdpr/dpia"));
});

test("search and frameworks work", () => {
  assert.ok(search("bias").length >= 1);
  assert.ok(frameworks().includes("EU AI Act"));
});
