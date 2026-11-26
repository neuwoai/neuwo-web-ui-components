import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { LIGHT_COMPONENT_CSS } from "../scripts/light-css.js";
import { flatRules } from "./fixtures/css-rules.js";
import { compare, splitTopLevel, weight } from "./fixtures/specificity.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(__dirname, path), "utf8");
const css = read("../src/components/selection/segmented/segmented.css");
const reset = read("../src/components/reset.css");

const strip = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "");
const reducedMotion = (strip(css).match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?\})\s*\}/) ?? [])[1] ?? "";
const outside = strip(css).replace(/@media[^{]*\{[\s\S]*?\}\s*\}/g, "");

/** @param {string} source */
const rulesIn = (source) =>
  Array.from(source.matchAll(/([^{}]+)\{([^{}]*)\}/g), ([, selectors, body]) => ({
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
 * The value the reset then the recipe give the element outside media queries: the heaviest selector, the later on a tie.
 * @param {Element} el
 * @param {string} property
 */
function winner(el, property) {
  let best = null;
  for (const rule of [...flatRules(reset), ...rulesIn(outside)]) {
    if (!rule.declarations.has(property)) continue;
    for (const selector of rule.selectors) {
      if (/::?(before|after)$/.test(selector) || !el.matches(selector)) continue;
      if (!best || compare(weight(selector), best.weight) >= 0) best = { weight: weight(selector), value: rule.declarations.get(property) };
    }
  }
  return best?.value;
}

afterEach(() => {
  document.body.innerHTML = "";
});

function mount(placedPill) {
  document.body.innerHTML =
    `<neuwo-segmented><div class="neuwo-choice"><div class="neuwo-segmented" role="radiogroup">` +
    `<span class="neuwo-segmented__indicator" aria-hidden="true"${placedPill ? " data-neuwo-placed" : ""}></span>` +
    `<button class="neuwo-segmented__option" aria-checked="false">A</button>` +
    `<button class="neuwo-segmented__option" aria-checked="true">B</button>` +
    `<select class="neuwo-segmented__options" hidden></select>` +
    `<input class="neuwo-segmented__form-value"></div></div></neuwo-segmented>`;
  const [other, selected] = document.querySelectorAll("button");
  return { indicator: document.querySelector("span"), other, selected, formValue: document.querySelector("input") };
}

describe("segmented.css recipe", () => {
  it("styles the pill and its options from tokens, with no hex colour literals and no shadow selectors", () => {
    expect(css).toMatch(/\.neuwo-segmented\s*\{[^}]*position: relative;[^}]*background: var\(--neuwo-glass-bg-light\);/);
    expect(css).toMatch(/\.neuwo-segmented__option\s*\{[^}]*color: var\(--neuwo-color-text-muted\);/);
    expect(css).toMatch(/\.neuwo-segmented__option:focus-visible\s*\{[^}]*box-shadow: var\(--neuwo-shadow-focus\);/);
    expect(css).toMatch(/\.neuwo-segmented__option:disabled\s*\{[^}]*opacity: var\(--neuwo-opacity-disabled\);/);
    expect(css).toMatch(/\.neuwo-segmented--error\s*\{[^}]*border-color: var\(--neuwo-color-red\);[^}]*box-shadow: var\(--neuwo-shadow-danger\);/);
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/:host|::part|::slotted|--animated|data-active/);
  });

  it("gives the selected option its own blue background and white text before the pill is placed", () => {
    const { indicator, other, selected } = mount(false);
    expect(winner(selected, "background")).toBe("var(--neuwo-color-blue)");
    expect(winner(selected, "color")).toBe("var(--neuwo-color-white)");
    expect(winner(other, "background")).toBe("transparent");
    expect(winner(indicator, "display")).toBe("none");
  });

  it("shows the pill only once placed, and the selected option's background then gives way to it", () => {
    const { indicator, selected } = mount(true);
    expect(winner(indicator, "display")).toBe("block");
    expect(winner(indicator, "background")).toBe("var(--neuwo-color-blue)");
    expect(winner(selected, "background")).toBe("transparent");
    expect(winner(selected, "color")).toBe("var(--neuwo-color-white)");
  });

  it("slides the placed pill and fades the option colours, both stopped under reduced motion", () => {
    expect(css).toMatch(/\.neuwo-segmented__indicator\s*\{[^}]*transition: transform var\(--neuwo-transition-base\), width var\(--neuwo-transition-base\);/);
    expect(css).toMatch(/\.neuwo-segmented__option\s*\{[^}]*transition: color var\(--neuwo-transition-fast\);/);
    const selectors = rulesIn(reducedMotion).flatMap((rule) => (rule.declarations.get("transition") === "none" ? rule.selectors : []));
    expect(selectors).toEqual(expect.arrayContaining([".neuwo-segmented__indicator", ".neuwo-segmented__option"]));
  });

  it("hides the form value over the pill, outweighing the reset's sizes", () => {
    const { formValue } = mount(false);
    expect(winner(formValue, "position")).toBe("absolute");
    expect(winner(formValue, "width")).toBe("100%");
    expect(winner(formValue, "height")).toBe("100%");
    expect(winner(formValue, "opacity")).toBe("0");
    expect(winner(formValue, "pointer-events")).toBe("none");
  });

  it("keeps a button's own text defaults on the options, over the page's that the reset would hand them", () => {
    const { other, selected } = mount(false);
    for (const option of [other, selected]) {
      for (const [property, value] of Object.entries({
        "text-align": "center",
        "text-transform": "none",
        "letter-spacing": "normal",
        "word-spacing": "normal",
        "text-indent": "0",
        "text-shadow": "none",
        "font-style": "normal",
        "font-variant": "normal",
        "font-weight": "var(--neuwo-font-weight-semibold)",
        "line-height": "normal",
      }))
        expect(winner(option, property), property).toBe(value);
    }
  });

  it("keeps every option on one line, as the button recipe does", () => {
    const { other, selected } = mount(false);
    for (const option of [other, selected]) expect(winner(option, "white-space")).toBe("nowrap");
  });

  it("lays the element out as an inline box unless it is hidden", () => {
    expect(css).toMatch(/neuwo-segmented:not\(\[hidden\]\)\s*\{\s*display: inline-flex;\s*\}/);
  });

  it("joins the light stylesheets and the reset's tag and block lists", () => {
    expect(LIGHT_COMPONENT_CSS).toContain("src/components/selection/segmented/segmented.css");
    expect(reset).toContain("neuwo-range, neuwo-segmented, ");
    expect(reset).toContain('.neuwo-segmented, [class*="neuwo-segmented__"], [class*="neuwo-segmented--"]');
  });
});
