import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Off disk, since Vitest resolves a CSS `?raw` import to an empty string.
const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(__dirname, "../src/components/copy/copy.css"), "utf8");
const tokensCss = readFileSync(join(__dirname, "../src/foundation/tokens.css"), "utf8");
const markdownCss = readFileSync(join(__dirname, "../src/foundation/markdown.css"), "utf8");
// Declarations only: the comments name hover, colour literals and !important.
const declarations = css.replace(/\/\*[\s\S]*?\*\//g, "");
const COPIED = 'neuwo-copy[data-neuwo-state="copied"] > .neuwo-copy > .neuwo-copy__button';
const FAILED = 'neuwo-copy[data-neuwo-state="failed"] > .neuwo-copy > .neuwo-copy__button';
const fieldCss = readFileSync(join(__dirname, "../src/components/fields/field.css"), "utf8");
const ruleFor = (selector) => {
  const found = declarations
    .split("}")
    .map((block) => block.split("{"))
    .find(([head]) => head.trim() === selector);
  return found ? found[1] : undefined;
};

describe("copy.css recipe", () => {
  it("keeps the element-name rule to the outer box, with every visual on the prefixed classes", () => {
    expect(declarations).not.toMatch(/:host|::part|::slotted/);
    const host = ruleFor("neuwo-copy");
    expect(host).toMatch(/display:\s*block/);
    expect(host).toMatch(/position:\s*relative/);
    for (const visual of ["background", "color", "border", "opacity", "box-shadow"]) {
      expect(host).not.toContain(`${visual}:`);
    }
  });

  it("gives the root no box, so the control anchors to the host, and keeps the content a block", () => {
    expect(ruleFor(".neuwo-copy")).toMatch(/display:\s*contents/);
    expect(ruleFor(".neuwo-copy__content")).toMatch(/display:\s*block/);
    expect(declarations).not.toMatch(/\.neuwo-copy(__content)? \{[^}]*position:/);
  });

  it("pins the control to the top end corner through a knob it never declares", () => {
    const rule = ruleFor(".neuwo-copy__button");
    expect(rule).toMatch(/position:\s*absolute/);
    expect(rule).toMatch(/top:\s*var\(--neuwo-copy-inset, var\(--neuwo-space-3\)\)/);
    expect(rule).toMatch(/inset-inline-end:\s*var\(--neuwo-copy-inset, var\(--neuwo-space-3\)\)/);
    expect(declarations).not.toMatch(/--neuwo-copy-inset:/);
    expect(rule).toMatch(/width:\s*var\(--neuwo-space-8\)/);
    expect(rule).toMatch(/height:\s*var\(--neuwo-space-8\)/);
  });

  // A tap leaves a touch screen in :hover, so a hover-only reveal would never appear or never leave.
  it("shows the control at rest and strengthens it on hover, never reveals it", () => {
    expect(ruleFor(".neuwo-copy__button")).toMatch(/opacity:\s*0\.45/);
    const strong = ruleFor(".neuwo-copy__button:hover,\n.neuwo-copy__button:focus-visible");
    expect(strong).toMatch(/opacity:\s*1/);
    expect(strong).toMatch(/color:\s*var\(--neuwo-color-heading\)/);
    expect(declarations).not.toMatch(/opacity:\s*0;/);
    expect(declarations).not.toContain("hover: none");
  });

  it("takes the shared focus ring, with the transparent outline that forced colours paint in its place", () => {
    const body = ruleFor(".neuwo-copy__button:focus-visible");
    expect(body).toMatch(/outline:\s*var\(--neuwo-outline-focus\)/);
    expect(body).toMatch(/box-shadow:\s*var\(--neuwo-shadow-focus\)/);
  });

  it("draws both glyphs as masks over the button's own colour", () => {
    const rest = ruleFor(".neuwo-copy__button::before");
    expect(rest).toMatch(/background:\s*currentColor/);
    expect(rest).toContain("mask:");
    expect(rest).toContain("-webkit-mask:");
    const done = ruleFor(`${COPIED}::before`);
    expect(done).toContain("mask-image:");
    expect(done).toContain("-webkit-mask-image:");
  });

  it("holds the confirmation solid and green from the host state, so it reads without a hover", () => {
    const rule = ruleFor(COPIED);
    expect(rule).toMatch(/opacity:\s*1/);
    expect(rule).toMatch(/color:\s*var\(--neuwo-color-green\)/);
    expect(declarations).not.toContain("--done");
  });

  it("draws a failure as a cross in the tick's place, held solid in the error line's colour from the host state", () => {
    const rule = ruleFor(FAILED);
    expect(rule).toMatch(/opacity:\s*1/);
    const [, red] = fieldCss.match(/\.neuwo-field__error \{[^}]*color:\s*(var\(--neuwo-color-[\w-]+\))/);
    expect(rule).toContain(`color: ${red}`);
    expect(rule).toMatch(/border-color:\s*var\(--neuwo-tint-red-20\)/);
    const glyph = ruleFor(`${FAILED}::before`);
    expect(glyph).toContain("mask-image:");
    expect(glyph).toContain("-webkit-mask-image:");
    const properties = (body) => Array.from(body.matchAll(/^\s*([\w-]+):/gm), ([, name]) => name);
    expect(properties(glyph)).toEqual(properties(ruleFor(`${COPIED}::before`)));
    expect(glyph).not.toBe(ruleFor(`${COPIED}::before`));
  });

  it("hides the status line visually while leaving it to a screen reader", () => {
    const rule = ruleFor(".neuwo-copy__status");
    expect(rule).toMatch(/position:\s*absolute/);
    expect(rule).toMatch(/width:\s*1px/);
    expect(rule).toMatch(/height:\s*1px/);
    expect(rule).toMatch(/clip:\s*rect\(0, 0, 0, 0\)/);
    expect(rule).not.toMatch(/display:\s*none/);
  });

  it("stills the transition under reduced motion", () => {
    const block = css.match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/)[0];
    expect(block).toContain(".neuwo-copy__button");
    expect(block).toMatch(/transition:\s*none/);
  });

  it("uses no raw colour literals", () => {
    expect(declarations).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(declarations).not.toMatch(/rgba?\(/);
  });

  it("only uses tokens that tokens.css defines", () => {
    for (const token of [
      "--neuwo-space-3",
      "--neuwo-space-8",
      "--neuwo-radius-md",
      "--neuwo-color-text-muted",
      "--neuwo-color-heading",
      "--neuwo-color-green",
      "--neuwo-color-surface-solid",
      "--neuwo-glass-border",
      "--neuwo-glass-border-hover",
      "--neuwo-tint-green-25",
      "--neuwo-shadow-focus",
      "--neuwo-transition-fast",
    ]) {
      expect(css).toContain(`var(${token})`);
      expect(tokensCss).toContain(`${token}:`);
    }
  });

  it("leaves the panel gutter to the Markdown surface, which owns the panel's padding", () => {
    expect(declarations).not.toMatch(/\bpre\b/);
    expect(markdownCss).toMatch(
      /\.neuwo-markdown neuwo-copy pre \{[^}]*padding-inline-end:\s*calc\(var\(--neuwo-space-8\) \+ var\(--neuwo-space-3\) \* 2\)/
    );
    expect(markdownCss).not.toMatch(/shadow (root|tree)|::slotted/);
  });
});
