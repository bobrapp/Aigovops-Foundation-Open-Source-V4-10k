// Phase 2 (anoint revive) — the one-format contract, enforced.
//
// Freezes the canonical receipt shape: a signed receipt must validate against
// schema/receipt.schema.json, carry exactly the frozen field set (so silent format
// drift fails CI), verify offline with the public key, and break on any tampering.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  signReceipt,
  verifyReceipt,
  generateKeypair,
  canonicalize,
  RECEIPT_SCHEMA,
} from "../src/sign.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(
  readFileSync(join(here, "../../../schema/receipt.schema.json"), "utf8"),
);

// Minimal, zero-dependency validator for the JSON-Schema subset this contract uses
// (object/required/additionalProperties + const/type/pattern/minLength). Returns a
// list of human-readable violations; empty means valid.
function validate(value, node) {
  const errors = [];
  if (node.type === "object" || node.properties) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return ["not an object"];
    }
    for (const req of node.required ?? []) {
      if (!(req in value)) errors.push(`missing required: ${req}`);
    }
    if (node.additionalProperties === false) {
      for (const k of Object.keys(value)) {
        if (!(k in (node.properties ?? {}))) errors.push(`unexpected property: ${k}`);
      }
    }
    for (const [k, sub] of Object.entries(node.properties ?? {})) {
      if (k in value) errors.push(...validate(value[k], sub).map((e) => `${k}: ${e}`));
    }
    return errors;
  }
  if ("const" in node && value !== node.const) {
    errors.push(`expected ${JSON.stringify(node.const)}, got ${JSON.stringify(value)}`);
  }
  if (node.type === "string" && typeof value !== "string") errors.push("expected string");
  if (node.minLength != null && typeof value === "string" && value.length < node.minLength) {
    errors.push(`shorter than ${node.minLength}`);
  }
  if (node.pattern && typeof value === "string" && !new RegExp(node.pattern).test(value)) {
    errors.push(`does not match /${node.pattern}/`);
  }
  return errors;
}

test("a freshly signed receipt validates against the frozen JSON Schema", () => {
  const { privateKey } = generateKeypair();
  const receipt = signReceipt({ decision: "PASS", model: "claude-opus-4-8" }, privateKey, {
    gate: "beacon",
  });
  const errors = validate(receipt, schema);
  assert.deepEqual(errors, [], `schema violations: ${errors.join("; ")}`);
  assert.equal(receipt.schema, RECEIPT_SCHEMA);
});

test("the receipt carries EXACTLY the frozen field set (any drift fails CI)", () => {
  const { privateKey } = generateKeypair();
  const receipt = signReceipt({ x: 1 }, privateKey);
  assert.deepEqual(
    Object.keys(receipt).sort(),
    ["algorithm", "evidenceHash", "gate", "issuedAt", "schema", "signature"],
  );
});

test("cross-system verify: any holder of the public key verifies the exact body offline", () => {
  const { publicKey, privateKey } = generateKeypair();
  const receipt = signReceipt({ decision: "PASS" }, privateKey);
  assert.equal(verifyReceipt(receipt, publicKey), true);
});

test("tamper on any signed field breaks verification", () => {
  const { publicKey, privateKey } = generateKeypair();
  const receipt = signReceipt({ decision: "PASS" }, privateKey);
  assert.equal(verifyReceipt({ ...receipt, evidenceHash: "0".repeat(64) }, publicKey), false);
  assert.equal(verifyReceipt({ ...receipt, gate: "forged" }, publicKey), false);
});

test("canonicalization is deterministic and key-order independent (the verify contract)", () => {
  const a = canonicalize({ b: 1, a: 2, nested: { y: 1, x: 2 } });
  const b = canonicalize({ nested: { x: 2, y: 1 }, a: 2, b: 1 });
  assert.equal(a, b);
});
