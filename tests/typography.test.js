import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Read the CSS off disk rather than via `import ... ?raw`: the build resolves
// `?raw` through an esbuild plugin, but Vitest does not transform it here (it
// yields an empty string), so these assertions need the real file contents.
const __dirname = dirname(fileURLToPath(import.meta.url));
const typographyCss = readFileSync(join(__dirname, "../src/foundation/typography.css"), "utf8");
const tokensCss = readFileSync(join(__dirname, "../src/foundation/tokens.css"), "utf8");

describe("typography stylesheet", () => {
  it("styles headings and body text from tokens", () => {
    expect(typographyCss).toContain("h1");
    expect(typographyCss).toContain("var(--neuwo-font-heading)");
    expect(typographyCss).toContain("var(--neuwo-font-size-6xl)");
    expect(typographyCss).toContain("var(--neuwo-font-weight-extrabold)");
    expect(typographyCss).toContain("var(--neuwo-line-height-display)");
    expect(typographyCss).toContain("var(--neuwo-color-text)");
  });

  it("leaves h1 at normal tracking, since the display value is hero-only", () => {
    // --neuwo-letter-spacing-display is tuned for a hero title, not for whatever h1
    // a page happens to have, so the sheet must not apply it automatically.
    const [h1Rule] = typographyCss.match(/(?:^|\n)h1 \{[^}]*\}/);
    expect(h1Rule).toContain("var(--neuwo-font-size-6xl)");
    expect(h1Rule).not.toContain("letter-spacing");
    expect(typographyCss).not.toContain("var(--neuwo-letter-spacing-display)");
  });

  it("only uses typography tokens that tokens.css defines", () => {
    for (const token of [
      "--neuwo-font-weight-normal",
      "--neuwo-font-weight-bold",
      "--neuwo-font-weight-extrabold",
      "--neuwo-line-height-display",
      "--neuwo-line-height-heading",
      "--neuwo-line-height-subheading",
      "--neuwo-line-height-body",
      "--neuwo-letter-spacing-display",
      "--neuwo-letter-spacing-display-secondary",
    ]) {
      expect(tokensCss).toContain(`${token}:`);
    }
  });

  it("ships both link hover treatments off one recipe", () => {
    // The bare element and .link share the resting rule, so the recipe is
    // authored once rather than restated for the class.
    expect(typographyCss).toMatch(/^a,\n\.link \{$/m);
    expect(typographyCss).toMatch(/^a:hover,\n\.link:hover \{$/m);
    expect(typographyCss).toMatch(
      /\.link:hover \{[^}]*color:\s*var\(--neuwo-color-blue-dark\)/
    );
    expect(typographyCss).toMatch(
      /\.link--hover-green:hover \{[^}]*color:\s*var\(--neuwo-color-green\)/
    );
    // The green modifier outranks a:hover on specificity, so it must not need
    // !important, which a consumer could then not override at all.
    expect(typographyCss).not.toMatch(/\.link--hover-green:hover \{[^}]*!important/);
  });

  it("ships the eyebrow utility class with the kicker type recipe", () => {
    expect(typographyCss).toContain(".eyebrow");
    expect(typographyCss).toContain("var(--neuwo-font-heading)");
    expect(typographyCss).toMatch(/letter-spacing:\s*0\.08em/);
    expect(typographyCss).toContain("text-transform: uppercase");
  });
});
