import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { LIGHT_COMPONENT_CSS } from "../scripts/light-css.js";
import { flatRules } from "./fixtures/css-rules.js";
import { closing, weight } from "./fixtures/specificity.js";

// Off disk, since Vitest resolves a CSS `?raw` import to an empty string.
const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(__dirname, "../src/foundation/navigation.css"), "utf8");
const tokensCss = readFileSync(join(__dirname, "../src/foundation/tokens.css"), "utf8");
// Comments stripped, so a term a comment names cannot fail the assertions that it appears nowhere.
const declarations = css.replace(/\/\*[\s\S]*?\*\//g, "");

const FORCED = "@media (forced-colors: active) {";

/** @param {string} source */
function outsideForced(source) {
  let out = source;
  for (let at = out.indexOf(FORCED); at >= 0; at = out.indexOf(FORCED)) out = out.slice(0, at) + out.slice(closing(out, out.indexOf("{", at), "{", "}") + 1);
  return out;
}

const rules = flatRules(outsideForced(declarations));
const forcedRules = (() => {
  const at = declarations.indexOf(FORCED);
  if (at < 0) return [];
  const open = declarations.indexOf("{", at);
  return flatRules(declarations.slice(open + 1, closing(declarations, open, "{", "}")));
})();

/**
 * The declarations of the one rule outside forced colours whose selector list is exactly `selectors`.
 * @param {string[]} selectors
 */
function ruleOf(selectors) {
  const found = rules.filter((rule) => JSON.stringify(rule.selectors) === JSON.stringify(selectors));
  expect(found, selectors.join(", ")).toHaveLength(1);
  return Object.fromEntries(found[0].declarations);
}

const INK = [".neuwo-nav-link:hover", ".neuwo-nav-link:focus-visible", ".neuwo-nav-section__row:focus-visible > .neuwo-nav-link", ".neuwo-nav-link[aria-current]", ".neuwo-nav-link--active"];
const BAR = [".neuwo-nav-link:hover::after", ".neuwo-nav-link:focus-visible::after", ".neuwo-nav-section__row:focus-visible > .neuwo-nav-link::after", ".neuwo-nav-link--active::after"];
const SMALL = [".neuwo-nav-link--sm", ".neuwo-nav-section__list .neuwo-nav-link"];

// The sheet before the sidebar's sections joined its lists, which a site linking it must see unchanged.
const BEFORE = [
  [[".neuwo-nav-link"], { "--neuwo-nav-link-gutter": "var(--neuwo-space-4)", display: "block", position: "relative", width: "fit-content", padding: "0 var(--neuwo-nav-link-gutter)", "min-height": "2.75rem", "line-height": "2.75rem", "border-radius": "var(--neuwo-radius-md)", color: "var(--neuwo-color-text)", "font-family": "var(--neuwo-font-text)", "font-size": "var(--neuwo-font-size-base)", "text-decoration": "none", transition: "color var(--neuwo-transition-fast)" }],
  [[".neuwo-nav-link--sm"], { "min-height": "auto", "line-height": "var(--neuwo-line-height-body)", padding: "var(--neuwo-space-2) var(--neuwo-nav-link-gutter)", "font-size": "var(--neuwo-font-size-sm)" }],
  [[".neuwo-nav-link::after"], { content: '""', position: "absolute", left: "var(--neuwo-nav-link-gutter)", right: "var(--neuwo-nav-link-gutter)", bottom: "0.375rem", height: "2px", background: "var(--neuwo-color-blue)", "border-radius": "1px", transform: "scaleX(0)", "transform-origin": "center", transition: "transform var(--neuwo-transition-fast)" }],
  [[".neuwo-nav-link--sm::after"], { bottom: "0" }],
  [[".neuwo-nav-link:hover", ".neuwo-nav-link:focus-visible", ".neuwo-nav-link[aria-current]", ".neuwo-nav-link--active"], { color: "var(--neuwo-color-heading)" }],
  [[".neuwo-nav-link:hover::after", ".neuwo-nav-link:focus-visible::after", ".neuwo-nav-link--active::after"], { transform: "scaleX(1)" }],
  [[".neuwo-nav-link", ".neuwo-nav-link::after"], { transition: "none" }],
];

describe("navigation stylesheet", () => {
  it("styles a top-level entry from tokens, at a 44px tap target", () => {
    const rule = css.match(/(?:^|\n)\.neuwo-nav-link \{[^}]*\}/)[0];
    expect(rule).toMatch(/color:\s*var\(--neuwo-color-text\)/);
    expect(rule).toMatch(/font-family:\s*var\(--neuwo-font-text\)/);
    expect(rule).toMatch(/font-size:\s*var\(--neuwo-font-size-base\)/);
    expect(rule).toMatch(/text-decoration:\s*none/);
    expect(rule).toMatch(/min-height:\s*2\.75rem/);
    expect(rule).toMatch(/line-height:\s*2\.75rem/);
  });

  it("steps the nested entry down a size and drops the tap target, for --sm and a name inside a section's list", () => {
    expect(ruleOf(SMALL)).toEqual({
      "min-height": "auto",
      "line-height": "var(--neuwo-line-height-body)",
      padding: "var(--neuwo-space-2) var(--neuwo-nav-link-gutter)",
      "font-size": "var(--neuwo-font-size-sm)",
    });
  });

  // A selector list, not :is(), which would weigh --sm as two classes and outrank a site's later one-class override.
  it("keeps --sm at the weight of one class", () => {
    const small = rules.flatMap((rule) => rule.selectors).filter((selector) => selector.startsWith(".neuwo-nav-link--sm"));
    expect(small).toEqual([".neuwo-nav-link--sm", ".neuwo-nav-link--sm::after"]);
    for (const selector of small) expect(weight(selector), selector).toEqual([0, 1, 0]);
  });

  it("derives the padding and the underline endpoints from one gutter property", () => {
    expect(css).toMatch(/--neuwo-nav-link-gutter:\s*var\(--neuwo-space-4\)/);
    expect(css).toMatch(/padding:\s*0 var\(--neuwo-nav-link-gutter\)/);
    expect(css).toMatch(/padding:\s*var\(--neuwo-space-2\) var\(--neuwo-nav-link-gutter\)/);
    const rule = css.match(/(?:^|\n)\.neuwo-nav-link::after \{[^}]*\}/)[0];
    expect(rule).toMatch(/left:\s*var\(--neuwo-nav-link-gutter\)/);
    expect(rule).toMatch(/right:\s*var\(--neuwo-nav-link-gutter\)/);
  });

  it("draws the underline as a centre-out bar in the brand blue", () => {
    const rule = css.match(/(?:^|\n)\.neuwo-nav-link::after \{[^}]*\}/)[0];
    expect(rule).toMatch(/content:\s*""/);
    expect(rule).toMatch(/height:\s*2px/);
    expect(rule).toMatch(/background:\s*var\(--neuwo-color-blue\)/);
    // The lifted baseline is the top-level entry's; the compact one sits flush.
    expect(rule).toMatch(/bottom:\s*0\.375rem/);
    expect(ruleOf(SMALL.map((selector) => `${selector}::after`))).toEqual({ bottom: "0" });
  });

  // Animated insets run layout every frame and leave a sub-pixel residue at rest; scaleX(0) is exactly nothing.
  it("grows the bar with a transform, never by animating layout", () => {
    const rule = css.match(/(?:^|\n)\.neuwo-nav-link::after \{[^}]*\}/)[0];
    expect(rule).toMatch(/transform:\s*scaleX\(0\)/);
    expect(rule).toMatch(/transform-origin:\s*center/);
    expect(rule).toMatch(/transition:\s*transform var\(--neuwo-transition-fast\)/);
    expect(rule).not.toMatch(/left:\s*50%/);
    expect(rule).not.toMatch(/right:\s*50%/);
    expect(ruleOf(BAR)).toEqual({ transform: "scaleX(1)" });
  });

  it("lifts the ink on hover, focus, a focused section row's name, the current page and when active", () => {
    expect(ruleOf(INK)).toEqual({ color: "var(--neuwo-color-heading)" });
    // A horizontal bar marks the current page rather than offering it, so `aria-current` alone shows no bar.
    expect(BAR.some((selector) => selector.includes("aria-current"))).toBe(false);
  });

  it("draws a focused section row's name with the bar a focused link has", () => {
    expect(INK).toContain(".neuwo-nav-section__row:focus-visible > .neuwo-nav-link");
    expect(ruleOf(BAR)).toEqual({ transform: "scaleX(1)" });
    expect(BAR).toContain(".neuwo-nav-section__row:focus-visible > .neuwo-nav-link::after");
  });

  // A vertical nav holds the bar open on the page and the section above it, which `aria-current` cannot say.
  it("holds the bar open for an active entry, composing with aria-current", () => {
    expect(BAR).toContain(".neuwo-nav-link--active::after");
    expect(ruleOf(BAR).transform).toBe("scaleX(1)");
  });

  it("keeps everything a site linking the sheet saw before, rule for rule, once the section selectors are set aside", () => {
    const mine = (selector) => selector.includes("neuwo-nav-section");
    const seen = rules.map((rule) => [rule.selectors.filter((selector) => !mine(selector)), Object.fromEntries(rule.declarations)]);
    expect(seen).toEqual(BEFORE);
  });

  it("paints the bar in the system's text colour under forced colours, and changes nothing else there", () => {
    expect(forcedRules.map((rule) => [rule.selectors, Object.fromEntries(rule.declarations)])).toEqual([[[".neuwo-nav-link::after"], { background: "CanvasText" }]]);
  });

  // The class beats `a` (0,1,0 over 0,0,1) and `a:hover` (0,2,0 over 0,1,1), so a consumer can still override it.
  it("wins against the bare anchor treatment without !important", () => {
    expect(declarations).not.toContain("!important");
  });

  it("stills both transitions under reduced motion", () => {
    const block = css.match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/)[0];
    expect(block).toContain(".neuwo-nav-link,");
    expect(block).toContain(".neuwo-nav-link::after");
    expect(block).toMatch(/transition:\s*none/);
  });

  it("carries no raw colour literal", () => {
    expect(declarations).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(declarations).not.toMatch(/rgba?\(/);
  });

  it("only uses tokens that tokens.css defines", () => {
    for (const token of [
      "--neuwo-space-2",
      "--neuwo-space-4",
      "--neuwo-radius-md",
      "--neuwo-color-text",
      "--neuwo-color-heading",
      "--neuwo-color-blue",
      "--neuwo-font-text",
      "--neuwo-font-size-base",
      "--neuwo-font-size-sm",
      "--neuwo-line-height-body",
      "--neuwo-transition-fast",
    ]) {
      expect(css).toContain(`var(${token})`);
      expect(tokensCss).toContain(`${token}:`);
    }
  });
});

describe("navigation stylesheet delivery", () => {
  const dist = (file) => join(__dirname, "../dist", file);
  const count = (text) => text.match(/(^|\n)\.neuwo-nav-link \{/g)?.length ?? 0;

  it("ships in the components stylesheet, after the reset and before the recipes", () => {
    expect(LIGHT_COMPONENT_CSS.indexOf("src/foundation/navigation.css")).toBe(2);
    const built = readFileSync(dist("neuwo-components.css"), "utf8");
    const reset = built.indexOf(":where(neuwo-");
    const at = built.indexOf(".neuwo-nav-link {");
    expect(reset).toBeGreaterThan(-1);
    expect(at).toBeGreaterThan(reset);
    expect(at).toBeLessThan(built.indexOf(".neuwo-badge {"));
  });

  it("appears once in neuwo.css and once in neuwo-components.css", () => {
    expect(count(readFileSync(dist("neuwo.css"), "utf8"))).toBe(1);
    expect(count(readFileSync(dist("neuwo-components.css"), "utf8"))).toBe(1);
  });

  it("is still published on its own", () => {
    expect(existsSync(dist("foundation/navigation.css"))).toBe(true);
    expect(readFileSync(dist("foundation/navigation.css"), "utf8")).toBe(css);
  });
});
