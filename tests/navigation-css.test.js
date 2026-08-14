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
    expect(rule).toMatch(/color:\s*var\(--color-text\)/);
    expect(rule).toMatch(/font-family:\s*var\(--font-text\)/);
    expect(rule).toMatch(/font-size:\s*var\(--font-size-base\)/);
    expect(rule).toMatch(/text-decoration:\s*none/);
    expect(rule).toMatch(/min-height:\s*2\.75rem/);
    expect(rule).toMatch(/line-height:\s*2\.75rem/);
  });

  it("steps the nested entry down a size and drops the tap target", () => {
    const rule = css.match(/(?:^|\n)\.nav-link--sm \{[^}]*\}/)[0];
    expect(rule).toMatch(/font-size:\s*var\(--font-size-sm\)/);
    expect(rule).toMatch(/min-height:\s*auto/);
    expect(rule).toMatch(/line-height:\s*var\(--line-height-body\)/);
  });

  // The gutter drives the padding and the underline's endpoints from one value,
  // so the bar cannot drift from the text above it.
  it("derives the padding and the underline endpoints from one gutter property", () => {
    expect(css).toMatch(/--nav-link-gutter:\s*var\(--space-4\)/);
    expect(css).toMatch(/padding:\s*0 var\(--nav-link-gutter\)/);
    expect(css).toMatch(/padding:\s*var\(--space-2\) var\(--nav-link-gutter\)/);
    const hover = css.match(/\.nav-link:hover::after,[^{]*\{[^}]*\}/)[0];
    expect(hover).toMatch(/left:\s*var\(--nav-link-gutter\)/);
    expect(hover).toMatch(/right:\s*var\(--nav-link-gutter\)/);
  });

  it("draws the underline as a centre-out bar in the brand blue", () => {
    const rule = css.match(/(?:^|\n)\.nav-link::after \{[^}]*\}/)[0];
    expect(rule).toMatch(/content:\s*""/);
    expect(rule).toMatch(/left:\s*50%/);
    expect(rule).toMatch(/right:\s*50%/);
    expect(rule).toMatch(/height:\s*2px/);
    expect(rule).toMatch(/background:\s*var\(--color-blue\)/);
    expect(rule).toMatch(/transition:\s*left var\(--transition-fast\), right var\(--transition-fast\)/);
    // The lifted baseline is the top-level entry's; the compact one sits flush.
    expect(rule).toMatch(/bottom:\s*0\.375rem/);
    expect(css).toMatch(/\.nav-link--sm::after \{[^}]*bottom:\s*0;/);
  });

  it("lifts the ink on hover, focus and for the current page", () => {
    const rule = css.match(
      /\.nav-link:hover,\n\.nav-link:focus-visible,\n\.nav-link\[aria-current\] \{[^}]*\}/
    )[0];
    expect(rule).toMatch(/color:\s*var\(--color-heading\)/);
    // The current page is marked, not a destination, so no underline for it.
    const hover = css.match(/\.nav-link:hover::after,[^{]*\{/)[0];
    expect(hover).not.toContain("aria-current");
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
      "--space-2",
      "--space-4",
      "--radius-md",
      "--color-text",
      "--color-heading",
      "--color-blue",
      "--font-text",
      "--font-size-base",
      "--font-size-sm",
      "--line-height-body",
      "--transition-fast",
    ]) {
      expect(css).toContain(`var(${token})`);
      expect(tokensCss).toContain(`${token}:`);
    }
  });
});
