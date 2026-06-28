import { test } from "node:test";
import assert from "node:assert/strict";
import { toRego } from "../src/index.mjs";

const POLICY = {
  name: "Edu EU",
  rules: [
    { path: "data.biasExamined", op: "equals", value: true, message: "Examine bias (EU AI Act Art. 10)." },
    { path: "model", op: "oneOf", value: ["claude-opus-4-8", "claude-sonnet-4-6"], message: "Use an approved model." },
    { path: "humanApproved", op: "required", message: "Human approval required." },
  ],
};

test("toRego emits a faithful OPA module: allow gated on an empty deny set", () => {
  const rego = toRego(POLICY);
  assert.match(rego, /^package aigovops\.edu_eu/m);   // name slugified
  assert.match(rego, /import rego\.v1/);
  assert.match(rego, /default allow := false/);
  assert.match(rego, /allow if count\(deny\) == 0/);
});

test("each operator translates to the violation condition + the cited message", () => {
  const rego = toRego(POLICY);
  assert.match(rego, /input\.data\.biasExamined != true/);                          // equals → !=
  assert.match(rego, /not input\.model in \{"claude-opus-4-8", "claude-sonnet-4-6"\}/); // oneOf → set membership
  assert.match(rego, /not input\.humanApproved/);                                   // required → not
  assert.match(rego, /msg := "Examine bias \(EU AI Act Art\. 10\)\."/);             // cited mitigation carried
});

test("custom package name is honored", () => {
  assert.match(toRego(POLICY, { package: "acme.gates" }), /^package acme\.gates/m);
});
