// M14 — the design-token system. One source of truth for both surfaces:
//   - the dark, technical Console/Studio  (brand)
//   - the warm, friendly Wizard           (consumer)
// Emit CSS custom properties so every surface (Studio, Wizard, the Tauri app, the consoles)
// renders from the same values — the foundation of an Intuit-grade, consistent product.

export const tokens = {
  color: {
    // brand (Console)
    bg: "#070b16", panel: "#0c1430", ink: "#e8edf7", muted: "#9aa6c2",
    teal: "#39d0c3", green: "#57e08a", gold: "#e7c069", rose: "#ff7a8a",
    // consumer (Wizard) — warm/light
    cream: "#f6f3ec", card: "#ffffff", "ink-light": "#1d2430", "muted-light": "#5d6b7a",
    "teal-deep": "#0f9b8e", "green-deep": "#1f9d57",
  },
  font: {
    display: "Fraunces, Georgia, serif",
    sans: "Inter, system-ui, sans-serif",
    mono: "DM Mono, ui-monospace, Menlo, monospace",
  },
  radius: { sm: "9px", md: "13px", lg: "20px", pill: "999px" },
  space: { 1: "6px", 2: "12px", 3: "18px", 4: "26px", 5: "40px" },
  motion: { fast: "150ms", base: "400ms" },
  shadow: { card: "0 14px 40px rgba(29,36,48,.06)", glow: "0 0 16px rgba(57,208,195,.5)" },
};

/** Flatten the tokens to CSS custom properties: { color:{teal} } → --color-teal. */
export function toCss(t = tokens) {
  const out = [":root {"];
  const walk = (obj, prefix) => {
    for (const [k, v] of Object.entries(obj)) {
      if (v && typeof v === "object") walk(v, `${prefix}${k}-`);
      else out.push(`  --${prefix}${k}: ${v};`);
    }
  };
  walk(t, "");
  out.push("}");
  return out.join("\n");
}

/** A single token by dotted path, e.g. tokenVar("color.teal") → "var(--color-teal)". */
export function tokenVar(path) {
  return `var(--${path.split(".").join("-")})`;
}
