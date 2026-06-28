import { test } from "node:test";
import assert from "node:assert/strict";
import { improve, toMarkdown } from "../src/index.mjs";

const CTX = { sector: "education", jurisdiction: "EU", dataTypes: ["personal", "children"], riskTier: "high" };

test("a thin policy yields cited gaps and a coverage score < 1", () => {
  const report = improve("We use an AI tutor and tell students it is AI.", CTX);
  assert.ok(report.applicableCount > 0);
  assert.ok(report.coverageScore < 1);
  assert.ok(report.gaps.length > 0);
  for (const g of report.gaps) assert.ok(g.citation, "every gap must carry a citation");
});

test("covered topics move from gaps to strengths", () => {
  const thin = improve("We use an AI tutor.", CTX);
  const rich = improve(
    "We use an AI tutor. Teachers provide human oversight and can override or intervene. " +
      "We log all events for traceability and audit. We disclose to students it is AI-generated.",
    CTX,
  );
  assert.ok(rich.strengths.length > thin.strengths.length);
  assert.ok(rich.coverageScore > thin.coverageScore);
  const richStrengthIds = rich.strengths.map((s) => s.id);
  assert.ok(richStrengthIds.includes("eu-ai-act/human-oversight"));
});

test("gaps surface candidate gates for the developer (M1→M2 hand-off)", () => {
  const report = improve("We use an AI tutor.", CTX);
  assert.ok(report.suggestedGates.length > 0);
  for (const sg of report.suggestedGates) {
    assert.ok(sg.rule.path && sg.rule.op, "a candidate gate needs a path + op");
    assert.ok(sg.citation);
  }
});

test("toMarkdown renders a cited brief", () => {
  const md = toMarkdown(improve("We use an AI tutor.", CTX));
  assert.match(md, /Policy improvement report/);
  assert.match(md, /Regulation \(EU\) 2024\/1689/); // a real citation is present
});
