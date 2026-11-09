import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Read the CSS off disk rather than via `import ... ?raw`: Vitest does not
// transform `?raw` for CSS here (it yields an empty string).
const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(__dirname, "../src/foundation/navigation.css"), "utf8");
const tokensCss = readFileSync(join(__dirname, "../src/foundation/tokens.css"), "utf8");
// Declarations only, for the assertions that a term appears nowhere: the
// comments discuss both !important and colour literals by name.
const declarations = css.replace(/\/\*[\s\S]*?\*\//g, "");

describe("navigation stylesheet", () => {
  it("styles a top-level entry from tokens, at a 44px tap target", () => {
    const rule = css.match(/(?:^|\n)\.nav-link \{[^}]*\}/)[0];
    expect(rule).toMatch(/color:\s*var\(--neuwo-color-text\)/);
    expect(rule).toMatch(/font-family:\s*var\(--neuwo-font-text\)/);
    expect(rule).toMatch(/font-size:\s*var\(--neuwo-font-size-base\)/);
    expect(rule).toMatch(/text-decoration:\s*none/);
    expect(rule).toMatch(/min-height:\s*2\.75rem/);
    expect(rule).toMatch(/line-height:\s*2\.75rem/);
  });

  it("steps the nested entry down a size and drops the tap target", () => {
    const rule = css.match(/(?:^|\n)\.nav-link--sm \{[^}]*\}/)[0];
    expect(rule).toMatch(/font-size:\s*var\(--neuwo-font-size-sm\)/);
    expect(rule).toMatch(/min-height:\s*auto/);
    expect(rule).toMatch(/line-height:\s*var\(--neuwo-line-height-body\)/);
  });

  // The gutter drives the padding and the underline's span from one value, so
  // the bar cannot drift from the text above it.
  it("derives the padding and the underline endpoints from one gutter property", () => {
    expect(css).toMatch(/--neuwo-nav-link-gutter:\s*var\(--neuwo-space-4\)/);
    expect(css).toMatch(/padding:\s*0 var\(--neuwo-nav-link-gutter\)/);
    expect(css).toMatch(/padding:\s*var\(--neuwo-space-2\) var\(--neuwo-nav-link-gutter\)/);
    const rule = css.match(/(?:^|\n)\.nav-link::after \{[^}]*\}/)[0];
    expect(rule).toMatch(/left:\s*var\(--neuwo-nav-link-gutter\)/);
    expect(rule).toMatch(/right:\s*var\(--neuwo-nav-link-gutter\)/);
  });

  it("draws the underline as a centre-out bar in the brand blue", () => {
    const rule = css.match(/(?:^|\n)\.nav-link::after \{[^}]*\}/)[0];
    expect(rule).toMatch(/content:\s*""/);
    expect(rule).toMatch(/height:\s*2px/);
    expect(rule).toMatch(/background:\s*var\(--neuwo-color-blue\)/);
    // The lifted baseline is the top-level entry's; the compact one sits flush.
    expect(rule).toMatch(/bottom:\s*0\.375rem/);
    expect(css).toMatch(/\.nav-link--sm::after \{[^}]*bottom:\s*0;/);
  });

  // A transform rather than two insets meeting at 50%: `left`/`right` are layout
  // properties, and a pair of them at 50% leaves a sub-pixel residue at rest on
  // a link of fractional width. scaleX(0) composites, and is exactly nothing.
  it("grows the bar with a transform, never by animating layout", () => {
    const rule = css.match(/(?:^|\n)\.nav-link::after \{[^}]*\}/)[0];
    expect(rule).toMatch(/transform:\s*scaleX\(0\)/);
    expect(rule).toMatch(/transform-origin:\s*center/);
    expect(rule).toMatch(/transition:\s*transform var\(--neuwo-transition-fast\)/);
    expect(rule).not.toMatch(/left:\s*50%/);
    expect(rule).not.toMatch(/right:\s*50%/);
    const shown = css.match(/\.nav-link:hover::after,[^{]*\{[^}]*\}/)[0];
    expect(shown).toMatch(/transform:\s*scaleX\(1\)/);
    expect(shown).not.toMatch(/left:|right:/);
  });

  it("lifts the ink on hover, focus, for the current page and when active", () => {
    const rule = css.match(
      /\.nav-link:hover,\n\.nav-link:focus-visible,\n\.nav-link\[aria-current\],\n\.nav-link--active \{[^}]*\}/
    )[0];
    expect(rule).toMatch(/color:\s*var\(--neuwo-color-heading\)/);
    // In a horizontal bar the current page is marked, not offered, so the bar
    // is withheld from `aria-current` alone.
    const shown = css.match(/\.nav-link:hover::after,[^{]*\{/)[0];
    expect(shown).not.toContain("aria-current");
  });

  // A vertical nav wants the bar held open on the current page and on the
  // section it sits under, which `aria-current` alone cannot express.
  it("holds the bar open for an active entry, composing with aria-current", () => {
    const shown = css.match(/\.nav-link:hover::after,[^{]*\{[^}]*\}/)[0];
    expect(shown).toContain(".nav-link--active::after");
    expect(shown).toMatch(/transform:\s*scaleX\(1\)/);
  });

  // The class beats typography.css's `a` (0,1,0 over 0,0,1) and its `a:hover`
  // (0,2,0 over 0,1,1), so nothing here has to be important, and a consumer can
  // still override every property from a document stylesheet.
  it("wins against the bare anchor treatment without !important", () => {
    expect(declarations).not.toContain("!important");
  });

  it("stills both transitions under reduced motion", () => {
    const block = css.match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/)[0];
    expect(block).toContain(".nav-link,");
    expect(block).toContain(".nav-link::after");
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
