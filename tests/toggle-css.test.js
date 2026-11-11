import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { compare, splitTopLevel, weight } from "./fixtures/specificity.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(__dirname, path), "utf8");
const css = read("../src/components/selection/toggle/toggle.css");
const reset = read("../src/components/reset.css");

/** @param {string} source */
const rulesIn = (source) =>
  Array.from(source.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g), ([, selectors, body]) => ({
    selectors: splitTopLevel(selectors.trim()),
    declarations: new Map(
      body
        .split(";")
        .map((declaration) => declaration.split(":").map((part) => part.trim()))
        .filter(([property]) => property)
        .map(([property, ...value]) => [property, value.join(":")]),
    ),
  }));

/**
 * The value the reset then the recipe give the element: the heaviest matching selector, the later one on a tie.
 * @param {Element} el
 * @param {string} property
 */
function winner(el, property) {
  let best = null;
  for (const rule of [...rulesIn(reset), ...rulesIn(css)]) {
    if (!rule.declarations.has(property)) continue;
    for (const selector of rule.selectors) {
      if (/::?(before|after)$/.test(selector) || !el.matches(selector)) continue;
      if (!best || compare(weight(selector), best.weight) >= 0) best = { weight: weight(selector), value: rule.declarations.get(property) };
    }
  }
  return best?.value;
}

describe("toggle.css recipe", () => {
  it("builds the track and thumb from tokens and fills the checked track solid blue", () => {
    expect(css).toContain(".neuwo-form-toggle__track");
    expect(css).toContain(".neuwo-form-toggle__track::after");
    expect(css).toContain("var(--neuwo-glass-bg-light)");
    expect(css).toContain("var(--neuwo-color-heading)");
    expect(css).toContain(".neuwo-form-toggle__input:checked + .neuwo-form-toggle__track");
    expect(css).toContain("var(--neuwo-color-blue)");
  });

  it("rings an unchecked switch when the pulse axis is on", () => {
    // Only while off: the ring is an invitation to flip it, so switching it on
    // ends the animation through the selector rather than through JS.
    expect(css).toMatch(/\.neuwo-form-toggle--pulse \.neuwo-form-toggle__input:not\(:checked\) \+ \.neuwo-form-toggle__track::before/);
    expect(css).toContain("animation: neuwo-toggle-pulse 3s ease-in-out infinite");
    expect(css).toContain("@keyframes neuwo-toggle-pulse");
    expect(css).not.toMatch(/@keyframes toggle-pulse/);
    // The ring reads in the brand accent, like the CTA's, not in the track's
    // own muted colour, which would barely register against the glass.
    expect(css).toMatch(/@keyframes neuwo-toggle-pulse[\s\S]*var\(--neuwo-color-blue\)/);
    expect(css).toContain("var(--neuwo-toggle-pulse-spread, 12px)");
    expect(css).toContain("var(--neuwo-toggle-pulse-alpha, 40%)");
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.neuwo-form-toggle--pulse[\s\S]*animation: none/);
  });

  it("uses tokens for focus/disabled/error and guards reduced motion", () => {
    expect(css).toContain("var(--neuwo-shadow-focus)");
    expect(css).toContain("var(--neuwo-opacity-disabled)");
    expect(css).toContain(".neuwo-form-toggle--error > .neuwo-form-toggle__track");
    expect(css).toContain("var(--neuwo-shadow-danger)");
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.neuwo-form-toggle__track,\s*\.neuwo-form-toggle__track::after\s*\{\s*transition: none;/);
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("lays the element out as an inline box unless it is hidden", () => {
    expect(css).toMatch(/neuwo-toggle:not\(\[hidden\]\)\s*\{\s*display: inline-flex;\s*\}/);
  });

  it("keeps the native switch visually hidden over the components reset", () => {
    document.body.innerHTML =
      `<neuwo-toggle><div class="neuwo-choice"><label class="neuwo-form-toggle">` +
      `<input class="neuwo-form-toggle__input" type="checkbox" role="switch"><span class="neuwo-form-toggle__track"></span>` +
      `</label></div></neuwo-toggle>`;
    const input = document.querySelector("input");
    expect(winner(input, "position")).toBe("absolute");
    expect(winner(input, "width")).toBe("1px");
    expect(winner(input, "height")).toBe("1px");
    expect(winner(input, "margin")).toBe("-1px");
    expect(winner(input, "white-space")).toBe("nowrap");
    expect(winner(input, "clip")).toBe("rect(0, 0, 0, 0)");
    document.body.innerHTML = "";
  });

  it("is in the reset's tag and block lists", () => {
    expect(reset).toContain("neuwo-toggle)");
    expect(reset).toContain('[class^="neuwo-form-toggle"], [class*=" neuwo-form-toggle"]');
  });
});
