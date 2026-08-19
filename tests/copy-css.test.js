import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Read the CSS off disk rather than via `import ... ?raw`: Vitest does not
// transform `?raw` for CSS here (it yields an empty string).
const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(__dirname, "../src/components/copy/copy.css"), "utf8");
const tokensCss = readFileSync(join(__dirname, "../src/foundation/tokens.css"), "utf8");
const markdownCss = readFileSync(join(__dirname, "../src/foundation/markdown.css"), "utf8");
// Declarations only: the comments name hover, colour literals and !important.
const declarations = css.replace(/\/\*[\s\S]*?\*\//g, "");

describe("copy.css recipe", () => {
  // The wrapper must not change how the content it wraps lays out, so :host
  // carries the positioning context and nothing else.
  it("keeps :host to layout, with every visual on the portable class", () => {
    const host = css.match(/(?:^|\n):host \{[^}]*\}/)[0];
    expect(host).toMatch(/display:\s*block/);
    expect(host).toMatch(/position:\s*relative/);
    for (const visual of ["background", "color", "border", "opacity", "box-shadow"]) {
      expect(host).not.toContain(`${visual}:`);
    }
    // No functional `:host(...)` styling: the design system parses the class.
    expect(declarations).not.toMatch(/:host\(/);
  });

  it("pins the control to the top end corner through a knob it never declares", () => {
    const rule = css.match(/(?:^|\n)\.copy \{[^}]*\}/)[0];
    expect(rule).toMatch(/position:\s*absolute/);
    expect(rule).toMatch(/top:\s*var\(--copy-inset, var\(--space-3\)\)/);
    // Logical, so a right-to-left page puts the control on the other side.
    expect(rule).toMatch(/inset-inline-end:\s*var\(--copy-inset, var\(--space-3\)\)/);
    expect(rule).not.toMatch(/--copy-inset:/);
    expect(rule).toMatch(/width:\s*var\(--space-8\)/);
    expect(rule).toMatch(/height:\s*var\(--space-8\)/);
  });

  // A hover-only reveal would either never appear or never leave on a touch
  // screen, where a tap sticks :hover with nothing to clear it.
  it("shows the control at rest and strengthens it on hover, never reveals it", () => {
    expect(css).toMatch(/\.copy \{[^}]*opacity:\s*0\.45/);
    const strong = css.match(/\.copy:hover,\n\.copy:focus-visible \{[^}]*\}/)[0];
    expect(strong).toMatch(/opacity:\s*1/);
    expect(strong).toMatch(/color:\s*var\(--color-heading\)/);
    expect(declarations).not.toMatch(/opacity:\s*0;/);
    expect(declarations).not.toContain("hover: none");
  });

  it("takes the shared focus ring rather than an outline of its own", () => {
    // The rule whose selector is exactly this, not the hover rule that also
    // lists `.copy:focus-visible` among its selectors.
    const [, body] = declarations
      .split("}")
      .map((block) => block.split("{"))
      .find(([selector]) => selector.trim() === ".copy:focus-visible");
    expect(body).toMatch(/outline:\s*none/);
    expect(body).toMatch(/box-shadow:\s*var\(--shadow-focus\)/);
  });

  // A mask over currentColor, as on the notice's close control: the glyph follows
  // the hover and any consumer re-colour, and the JS never builds an icon.
  it("draws both glyphs as masks over the button's own colour", () => {
    const rest = css.match(/\.copy::before \{[^}]*\}/)[0];
    expect(rest).toMatch(/background:\s*currentColor/);
    expect(rest).toContain("mask:");
    expect(rest).toContain("-webkit-mask:");
    const done = css.match(/\.copy--done::before \{[^}]*\}/)[0];
    expect(done).toContain("mask-image:");
    expect(done).toContain("-webkit-mask-image:");
  });

  it("holds the confirmation solid and green so it reads without a hover", () => {
    const rule = css.match(/(?:^|\n)\.copy--done \{[^}]*\}/)[0];
    expect(rule).toMatch(/opacity:\s*1/);
    expect(rule).toMatch(/color:\s*var\(--color-green\)/);
  });

  it("hides the status line visually while leaving it to a screen reader", () => {
    const rule = css.match(/\.copy__status \{[^}]*\}/)[0];
    expect(rule).toMatch(/position:\s*absolute/);
    expect(rule).toMatch(/width:\s*1px/);
    expect(rule).toMatch(/height:\s*1px/);
    expect(rule).toMatch(/clip:\s*rect\(0, 0, 0, 0\)/);
    expect(rule).not.toMatch(/display:\s*none/);
  });

  it("stills the transition under reduced motion", () => {
    const block = css.match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/)[0];
    expect(block).toContain(".copy");
    expect(block).toMatch(/transition:\s*none/);
  });

  it("uses no raw colour literals", () => {
    expect(declarations).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(declarations).not.toMatch(/rgba?\(/);
  });

  it("only uses tokens that tokens.css defines", () => {
    for (const token of [
      "--space-3",
      "--space-8",
      "--radius-md",
      "--color-text-muted",
      "--color-heading",
      "--color-green",
      "--color-surface-solid",
      "--glass-border",
      "--glass-border-hover",
      "--tint-green-25",
      "--shadow-focus",
      "--transition-fast",
    ]) {
      expect(css).toContain(`var(${token})`);
      expect(tokensCss).toContain(`${token}:`);
    }
  });

  // The shadow root cannot widen a slotted panel's padding: a declaration from
  // the outer tree beats one from a shadow tree for slotted content, whatever
  // the specificity. So the gutter lives in the document sheet, derived from the
  // control's own size and inset so the two cannot drift.
  it("leaves the panel gutter to markdown.css, which is the only sheet that can set it", () => {
    expect(declarations).not.toMatch(/::slotted/);
    expect(markdownCss).toMatch(
      /\.markdown neuwo-copy pre \{[^}]*padding-right:\s*calc\(var\(--space-8\) \+ var\(--space-3\) \* 2\)/
    );
  });
});
