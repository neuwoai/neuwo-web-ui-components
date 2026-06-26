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
    expect(typographyCss).toContain("var(--font-heading)");
    expect(typographyCss).toContain("var(--font-size-6xl)");
    expect(typographyCss).toContain("var(--font-weight-extrabold)");
    expect(typographyCss).toContain("var(--line-height-display)");
    expect(typographyCss).toContain("var(--letter-spacing-display)");
    expect(typographyCss).toContain("var(--color-text)");
  });

  it("only uses typography tokens that tokens.css defines", () => {
    for (const token of [
      "--font-weight-normal",
      "--font-weight-bold",
      "--font-weight-extrabold",
      "--line-height-display",
      "--line-height-heading",
      "--line-height-subheading",
      "--line-height-body",
      "--letter-spacing-display",
    ]) {
      expect(tokensCss).toContain(`${token}:`);
    }
  });

  it("ships the eyebrow utility class with the kicker type recipe", () => {
    expect(typographyCss).toContain(".eyebrow");
    expect(typographyCss).toContain("var(--font-heading)");
    expect(typographyCss).toMatch(/letter-spacing:\s*0\.08em/);
    expect(typographyCss).toContain("text-transform: uppercase");
  });
});
