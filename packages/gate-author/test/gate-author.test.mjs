import { test } from "node:test";
import assert from "node:assert/strict";
import { authorPolicy, compliantExample, toMarkdown } from "../src/index.mjs";
import { improve } from "../../policy-improver/src/index.mjs";
import { compile } from "../../umbrella/src/index.mjs";

const report = improve("We use an AI tutor.", { sector: "education", jurisdiction: "EU", dataTypes: ["personal", "children"], riskTier: "high" });

test("authors a runnable policy with all three exit states and citations", () => {
  const a = authorPolicy(report);
  assert.ok(a.policy.rules.length > 0);
  for (const r of a.policy.rules) {
    assert.ok(r.message, "every authored rule carries a Recover-to-YES message");
    const ex = a.exitStates[r.path];
    assert.ok(ex.getToYes && ex.stayAtYes && ex.recoverToYes);
    assert.ok(a.citations[r.path], "every gate keeps its citation");
  }
});

test("an authored policy actually compiles and runs", () => {
  const a = authorPolicy(report);
  const evaluator = compile(a.policy);
  assert.equal(evaluator.evaluate(compliantExample(a.policy)).status, "PASS");
  assert.equal(evaluator.evaluate({}).status, "FAIL");
});

test("empty input is rejected", () => {
  assert.throws(() => authorPolicy([]), /no candidate gates/);
});

test("toMarkdown renders the gate spec with citations", () => {
  const md = toMarkdown(authorPolicy(report));
  assert.match(md, /Get to YES:/);
  assert.match(md, /Recover to YES:/);
});
