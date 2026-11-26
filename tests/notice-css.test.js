import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(__dirname, "../src/components/notice/notice.css"), "utf8");
const tokensCss = readFileSync(join(__dirname, "../src/foundation/tokens.css"), "utf8");
const declarations = css.replace(/\/\*[\s\S]*?\*\//g, "");
const ruleFor = (selector) => {
  const found = declarations
    .split("}")
    .map((block) => block.split("{"))
    .find(([head]) => head.trim() === selector);
  return found ? found[1] : undefined;
};

describe("notice.css recipe", () => {
  it("keeps the element-name rule to the outer box, with no shadow-only selectors", () => {
    expect(declarations).not.toMatch(/:host|::part|::slotted/);
    expect(ruleFor("neuwo-notice").trim()).toBe("display: block;");
    expect(declarations.match(/(^|[},\s])neuwo-notice[\s,{[:]/g)).toHaveLength(1);
  });

  it("paints the shared glass surface from tokens on the prefixed card class", () => {
    const card = ruleFor(".neuwo-notice");
    for (const value of [
      "var(--neuwo-glass-bg)",
      "var(--neuwo-glass-border)",
      "blur(var(--neuwo-glass-blur))",
      "var(--neuwo-shadow-xl)",
      "var(--neuwo-radius-xl)",
    ]) {
      expect(card).toContain(value);
    }
    expect(card).toContain("-webkit-backdrop-filter");
  });

  it("reads its width and gutter knobs with a fallback, never declaring them", () => {
    expect(declarations).not.toMatch(/--neuwo-notice-max-width:/);
    expect(declarations).not.toMatch(/--neuwo-notice-gutter:/);
    expect(ruleFor(".neuwo-notice")).toContain("max-width: var(--neuwo-notice-max-width, 24rem)");
    expect(ruleFor(".neuwo-notice--fixed")).toContain("width: calc(100% - var(--neuwo-notice-gutter, var(--neuwo-space-4)) * 2)");
  });

  it("composes a placement from independent edge modifiers with logical insets", () => {
    for (const modifier of ["fixed", "top", "bottom", "start", "end", "center"]) expect(ruleFor(`.neuwo-notice--${modifier}`), modifier).toBeDefined();
    expect(ruleFor(".neuwo-notice--fixed")).toContain("var(--neuwo-z-overlay)");
    expect(ruleFor(".neuwo-notice--start")).toContain("inset-inline-start: var(--neuwo-notice-gutter");
    expect(ruleFor(".neuwo-notice--end")).toContain("inset-inline-end: var(--neuwo-notice-gutter");
  });

  it("keeps the entrance off `transform`, which the centred placement owns, under a prefixed keyframes name", () => {
    expect(ruleFor(".neuwo-notice")).toMatch(/animation: neuwo-notice-in var\(--neuwo-transition-base\) both/);
    expect(css).toMatch(/@keyframes neuwo-notice-in\s*\{[^}]*\{[^}]*translate: 0 var\(--neuwo-notice-rise\)/);
    expect(declarations).not.toMatch(/@keyframes notice-in/);
    expect(ruleFor(".neuwo-notice--center")).toMatch(/transform: translateX\(-50%\)/);
  });

  it("reserves the close button's corner on the card and draws the cross as a mask over its own colour", () => {
    expect(ruleFor(".neuwo-notice--dismissible")).toMatch(/padding-inline-end:\s*calc\(var\(--neuwo-space-3\) \+ var\(--neuwo-space-8\) \+ var\(--neuwo-space-2\)\);/);
    const glyph = ruleFor(".neuwo-notice__dismiss::before");
    expect(glyph).toMatch(/background: currentColor/);
    expect(glyph).toContain("mask:");
    expect(glyph).toContain("-webkit-mask:");
    expect(ruleFor(".neuwo-notice__dismiss:focus-visible::after")).toContain("var(--neuwo-shadow-focus-ring)");
  });

  it("gives a filled close button a subtle white background, stronger on hover and keyboard focus", () => {
    expect(ruleFor(".neuwo-notice__dismiss--filled")).toMatch(/background-color: color-mix\(in srgb, var\(--neuwo-color-white\) 15%, transparent\);/);
    expect(ruleFor(".neuwo-notice__dismiss--filled:hover,\n.neuwo-notice__dismiss--filled:focus-visible")).toMatch(/background-color: color-mix\(in srgb, var\(--neuwo-color-white\) 25%, transparent\);/);
    expect(ruleFor(".neuwo-notice__dismiss")).toMatch(/transition: opacity var\(--neuwo-transition-fast\), color var\(--neuwo-transition-fast\), background-color var\(--neuwo-transition-fast\);/);
  });

  it("rests the close button dimmed and brings it to full strength, behind a soft square, on hover and keyboard focus", () => {
    expect(ruleFor(".neuwo-notice__dismiss")).toMatch(/opacity: 0\.6;/);
    const active = ruleFor(".neuwo-notice__dismiss:hover,\n.neuwo-notice__dismiss:focus-visible");
    expect(active).toMatch(/opacity: 1;/);
    expect(active).toMatch(/color: var\(--neuwo-color-heading\);/);
    expect(active).toMatch(/background-color: color-mix\(in srgb, var\(--neuwo-color-white\) 10%, transparent\);/);
    expect(declarations.indexOf(".neuwo-notice__dismiss--filled:hover")).toBeGreaterThan(declarations.indexOf(".neuwo-notice__dismiss:hover"));
  });

  it("keeps the close button at full strength in forced colours, where the dimming would cost contrast", () => {
    const forced = css.match(/@media \(forced-colors: active\) \{[\s\S]*?\n\}/)[0];
    expect(forced).toMatch(/\.neuwo-notice__dismiss\s*\{\s*opacity: 1;/);
  });

  it("stacks by default and turns to a row only when there is room", () => {
    expect(ruleFor(".neuwo-notice")).toMatch(/flex-direction: column/);
    expect(css).toMatch(/@media \(min-width: 48rem\)[\s\S]*\.neuwo-notice--row\s*\{[^}]*flex-direction: row/);
  });

  it("takes an empty wrapper out of the flow, after the rules that give the wrappers a display", () => {
    const empty = ".neuwo-notice__title--empty,\n.neuwo-notice__message--empty,\n.neuwo-notice__actions--empty";
    expect(ruleFor(empty)).toMatch(/display: none/);
    expect(declarations.indexOf(empty)).toBeGreaterThan(declarations.indexOf(".neuwo-notice__actions {"));
  });

  it("stills the entrance and the hover under reduced motion", () => {
    const block = css.match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/)[0];
    expect(block).toMatch(/\.neuwo-notice\s*\{\s*animation: none;/);
    expect(block).toMatch(/\.neuwo-notice__dismiss\s*\{\s*transition: none;/);
  });

  it("uses no raw colour literals, and only tokens that tokens.css defines", () => {
    expect(declarations.replace(/url\([^)]*\)/g, "")).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
    for (const [, token] of declarations.matchAll(/var\((--neuwo-[\w-]+)/g)) {
      if (["--neuwo-notice-max-width", "--neuwo-notice-gutter", "--neuwo-notice-rise"].includes(token)) continue;
      expect(tokensCss, token).toContain(`${token}:`);
    }
  });
});
