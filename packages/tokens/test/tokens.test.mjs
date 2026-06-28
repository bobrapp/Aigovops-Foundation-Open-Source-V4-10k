import { test } from "node:test";
import assert from "node:assert/strict";
import { tokens, toCss, tokenVar } from "../src/index.mjs";

test("tokens cover both surfaces", () => {
  assert.ok(tokens.color.teal && tokens.color.cream);     // brand + consumer
  assert.ok(tokens.font.display && tokens.radius.lg);
});

test("toCss flattens to CSS custom properties", () => {
  const css = toCss();
  assert.match(css, /:root \{/);
  assert.match(css, /--color-teal: #39d0c3;/);
  assert.match(css, /--font-display: Fraunces/);
  assert.match(css, /--radius-lg: 20px;/);
});

test("tokenVar builds a var() reference", () => {
  assert.equal(tokenVar("color.teal"), "var(--color-teal)");
});
