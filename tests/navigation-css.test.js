import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { LIGHT_COMPONENT_CSS } from "../scripts/light-css.js";

// Off disk, since Vitest resolves a CSS `?raw` import to an empty string.
const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(__dirname, "../src/foundation/navigation.css"), "utf8");
const tokensCss = readFileSync(join(__dirname, "../src/foundation/tokens.css"), "utf8");
// Comments stripped, so a term a comment names cannot fail the assertions that it appears nowhere.
const declarations = css.replace(/\/\*[\s\S]*?\*\//g, "");

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

  it("steps the nested entry down a size and drops the tap target", () => {
    const rule = css.match(/(?:^|\n)\.neuwo-nav-link--sm \{[^}]*\}/)[0];
    expect(rule).toMatch(/font-size:\s*var\(--neuwo-font-size-sm\)/);
    expect(rule).toMatch(/min-height:\s*auto/);
    expect(rule).toMatch(/line-height:\s*var\(--neuwo-line-height-body\)/);
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
    expect(css).toMatch(/\.neuwo-nav-link--sm::after \{[^}]*bottom:\s*0;/);
  });

  // Animated insets run layout every frame and leave a sub-pixel residue at rest; scaleX(0) is exactly nothing.
  it("grows the bar with a transform, never by animating layout", () => {
    const rule = css.match(/(?:^|\n)\.neuwo-nav-link::after \{[^}]*\}/)[0];
    expect(rule).toMatch(/transform:\s*scaleX\(0\)/);
    expect(rule).toMatch(/transform-origin:\s*center/);
    expect(rule).toMatch(/transition:\s*transform var\(--neuwo-transition-fast\)/);
    expect(rule).not.toMatch(/left:\s*50%/);
    expect(rule).not.toMatch(/right:\s*50%/);
    const shown = css.match(/\.neuwo-nav-link:hover::after,[^{]*\{[^}]*\}/)[0];
    expect(shown).toMatch(/transform:\s*scaleX\(1\)/);
    expect(shown).not.toMatch(/left:|right:/);
  });

  it("lifts the ink on hover, focus, for the current page and when active", () => {
    const rule = css.match(
      /\.neuwo-nav-link:hover,\n\.neuwo-nav-link:focus-visible,\n\.neuwo-nav-link\[aria-current\],\n\.neuwo-nav-link--active \{[^}]*\}/
    )[0];
    expect(rule).toMatch(/color:\s*var\(--neuwo-color-heading\)/);
    // A horizontal bar marks the current page rather than offering it, so `aria-current` alone shows no bar.
    const shown = css.match(/\.neuwo-nav-link:hover::after,[^{]*\{/)[0];
    expect(shown).not.toContain("aria-current");
  });

  // A vertical nav holds the bar open on the page and the section above it, which `aria-current` cannot say.
  it("holds the bar open for an active entry, composing with aria-current", () => {
    const shown = css.match(/\.neuwo-nav-link:hover::after,[^{]*\{[^}]*\}/)[0];
    expect(shown).toContain(".neuwo-nav-link--active::after");
    expect(shown).toMatch(/transform:\s*scaleX\(1\)/);
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
