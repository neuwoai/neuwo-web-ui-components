import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(__dirname, "../src/components/cta/cta.css"), "utf8");
const tokensCss = readFileSync(join(__dirname, "../src/foundation/tokens.css"), "utf8");
const declarations = css.replace(/\/\*[\s\S]*?\*\//g, "");
const rules = Array.from(declarations.matchAll(/([^{}]+)\{([^{}]*)\}/g), ([, head, body]) => ({
  selectors: head.split(",").map((selector) => selector.trim()),
  body,
}));
const ruleFor = (selector) => rules.find((rule) => rule.selectors.length === 1 && rule.selectors[0] === selector)?.body;
const blocks = (query) => [...declarations.matchAll(new RegExp(`@media \\(${query}\\) \\{[\\s\\S]*?\\n\\}`, "g"))].map((m) => m[0]);

const PULSE = "neuwo-cta[pulse] .neuwo-cta__actions > neuwo-button:first-of-type";

describe("cta.css recipe", () => {
  it("keeps the element-name rules to the outer box and the pulse condition, with no shadow-only selectors", () => {
    expect(declarations).not.toMatch(/:host|::part|::slotted/);
    expect(ruleFor("neuwo-cta").trim()).toBe("display: block;");
    const named = rules.flatMap((rule) => rule.selectors).filter((selector) => /^neuwo-cta\b/.test(selector));
    for (const selector of named.filter((selector) => selector !== "neuwo-cta")) {
      expect(selector).toMatch(/^neuwo-cta\[pulse\](\[intensity="[sl]"\])?(:hover)? \.neuwo-cta__actions > neuwo-button:first-of-type$/);
    }
  });

  it("styles both variants from tokens on the branded surface", () => {
    expect(ruleFor(".neuwo-cta--banner")).toContain("var(--neuwo-color-surface-solid)");
    expect(ruleFor(".neuwo-cta--banner")).toContain("var(--neuwo-radius-lg)");
    expect(ruleFor(".neuwo-cta--spotlight")).toContain("var(--neuwo-radius-2xl)");
    expect(ruleFor(".neuwo-cta__inner")).toContain("var(--neuwo-color-surface-solid)");
  });

  it("isolates the spotlight, so the glow's negative z-index stays inside the card", () => {
    expect(ruleFor(".neuwo-cta--spotlight")).toMatch(/isolation: isolate/);
    expect(ruleFor(".neuwo-cta__glow")).toMatch(/z-index: -1/);
  });

  it("paints accent fragments anywhere in the headline with the brand gradient", () => {
    const accent = ruleFor(".neuwo-cta__headline [data-accent]");
    expect(accent).toContain("var(--neuwo-gradient-accent)");
    expect(accent).toContain("background-clip: text");
    expect(accent).toContain("color: transparent");
  });

  it("prefixes the shimmer, spin and pulse keyframes and drops the old names", () => {
    for (const name of ["neuwo-cta-scan", "neuwo-cta-spin", "neuwo-cta-button-pulse"]) {
      expect(declarations.match(new RegExp(`@keyframes ${name} `, "g")), name).toHaveLength(1);
    }
    expect(declarations).not.toMatch(/@keyframes cta-|animation: cta-/);
    expect(ruleFor(".neuwo-cta--banner::after")).toContain("animation: neuwo-cta-scan 5.5s");
    expect(ruleFor(".neuwo-cta__inner::before")).toContain("animation: neuwo-cta-scan 5.5s");
    expect(declarations).toContain("var(--neuwo-cta-angle)");
    expect(declarations).toContain("conic-gradient");
  });

  it("rings the first action button with the synchronised pulse, through a descendant selector", () => {
    const pulse = ruleFor(PULSE);
    expect(pulse).toContain("animation: neuwo-cta-button-pulse 5.5s ease-in-out infinite");
    expect(pulse).toContain("--neuwo-cta-pulse-spread: 12px");
    expect(pulse).toContain("--neuwo-cta-pulse-alpha: 40%");
  });

  it("scales the ring from the intensity axis without a second keyframe block", () => {
    expect(ruleFor('neuwo-cta[pulse][intensity="s"] .neuwo-cta__actions > neuwo-button:first-of-type')).toContain("--neuwo-cta-pulse-spread: 8px");
    expect(ruleFor('neuwo-cta[pulse][intensity="l"] .neuwo-cta__actions > neuwo-button:first-of-type')).toContain("--neuwo-cta-pulse-spread: 18px");
    expect(declarations).toContain("var(--neuwo-cta-pulse-spread)");
    expect(declarations).toContain("var(--neuwo-cta-pulse-alpha)");
  });

  it("rings the first action button whatever its variant", () => {
    expect(declarations).not.toContain("neuwo-button[variant=");
  });

  // A tap leaves the element in :hover with nothing to take it out again. For a
  // colour that is invisible; for a rule that starts or stops an animation it
  // sticks for the life of the page, so every one of those is guarded.
  it("guards every hover rule that starts or stops an animation", () => {
    const guarded = blocks("hover: hover");
    for (const selector of [
      "neuwo-cta[pulse]:hover .neuwo-cta__actions > neuwo-button:first-of-type",
      ".neuwo-cta--banner:hover::after",
      ".neuwo-cta--spotlight:hover {",
      ".neuwo-cta--spotlight:hover .neuwo-cta__glow",
      ".neuwo-cta--spotlight:hover .neuwo-cta__inner::before",
    ]) {
      expect(guarded.some((block) => block.includes(selector)), selector).toBe(true);
    }
  });

  it("leaves the plain colour and shadow hovers unguarded", () => {
    const outside = declarations.replace(/@media \(hover: hover\) \{[\s\S]*?\n\}/g, "");
    expect(outside).toMatch(/\.neuwo-cta--banner:hover \{[^}]*box-shadow/);
  });

  it("stills every animation, the pulse included, under reduced motion", () => {
    const [block] = blocks("prefers-reduced-motion: reduce");
    for (const selector of [".neuwo-cta--banner::after", ".neuwo-cta__inner::before", ".neuwo-cta--spotlight:hover", ".neuwo-cta--spotlight:hover .neuwo-cta__glow", PULSE]) {
      expect(block, selector).toContain(selector);
    }
    expect(block).toMatch(/\{\s*animation: none;\s*\}/);
  });

  it("caps the field with a knob it never declares", () => {
    expect(ruleFor(".neuwo-cta__field")).toContain("max-width: var(--neuwo-cta-field-width, 24rem)");
    expect(declarations).not.toMatch(/--neuwo-cta-field-width:/);
    expect(ruleFor(".neuwo-cta__field--empty")).toMatch(/display:\s*none/);
    expect(blocks("max-width: 40rem")[0]).toMatch(/\.neuwo-cta--banner \.neuwo-cta__field\s*\{[^}]*margin-inline: auto/);
  });

  it("tokenises the three status states and costs no space when empty", () => {
    expect(ruleFor(".neuwo-cta__status")).toContain("color: var(--neuwo-color-grey-400)");
    expect(ruleFor(".neuwo-cta__status--success")).toContain("color: var(--neuwo-color-green)");
    expect(ruleFor(".neuwo-cta__status--error")).toContain("color: var(--neuwo-color-red)");
    expect(ruleFor(".neuwo-cta__status:empty")).toMatch(/margin-top:\s*0/);
  });

  it("uses no raw colour literals, and only tokens that tokens.css defines", () => {
    expect(declarations).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
    const own = ["--neuwo-cta-angle", "--neuwo-cta-field-width", "--neuwo-cta-pulse-spread", "--neuwo-cta-pulse-alpha"];
    for (const [, token] of declarations.matchAll(/var\((--neuwo-[\w-]+)/g)) {
      if (own.includes(token)) continue;
      expect(tokensCss, token).toContain(`${token}:`);
    }
  });
});
