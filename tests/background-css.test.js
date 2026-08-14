import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Read the CSS off disk rather than via `import ... ?raw`: Vitest does not
// transform `?raw` for CSS here (it yields an empty string).
const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(__dirname, "../src/foundation/background.css"), "utf8");
const tokensCss = readFileSync(join(__dirname, "../src/foundation/tokens.css"), "utf8");

describe("page surface stylesheet", () => {
  it("styles the page body from tokens", () => {
    expect(css).toMatch(/\.body \{[^}]*font-family:\s*var\(--font-text\)/);
    expect(css).toMatch(/\.body \{[^}]*font-size:\s*var\(--font-size-base\)/);
    expect(css).toMatch(/\.body \{[^}]*line-height:\s*var\(--line-height-body\)/);
    expect(css).toMatch(/\.body \{[^}]*color:\s*var\(--color-text\)/);
    expect(css).toMatch(/\.body \{[^}]*background-color:\s*var\(--color-body-bg\)/);
    expect(css).toMatch(/\.body \{[^}]*-webkit-font-smoothing:\s*antialiased/);
    expect(css).toMatch(/\.body \{[^}]*-moz-osx-font-smoothing:\s*grayscale/);
  });

  // The geometry is copied verbatim from the main website, so a future change
  // there shows up here as a failing assertion rather than as visual drift.
  it("stacks the four brand blobs at their published geometry", () => {
    const layers = [...css.matchAll(/radial-gradient\(ellipse ([^,]+),/g)].map((m) => m[1].trim());
    expect(layers).toEqual([
      "50% 40% at 20% 20%",
      "40% 50% at 75% 15%",
      "60% 35% at 50% 60%",
      "45% 45% at 80% 70%",
    ]);
  });

  it("tints each blob at the opacity the brand uses, blue then green alternating", () => {
    const gradient = css.slice(css.indexOf(".background__gradient"));
    expect(gradient).toContain("var(--tint-blue-10)");
    expect(gradient).toContain("color-mix(in srgb, var(--color-green) 7%, transparent)");
    expect(gradient).toContain("color-mix(in srgb, var(--color-blue) 6%, transparent)");
    expect(gradient).toContain("var(--tint-green-5)");
  });

  it("carries no raw colour literal", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/rgba?\(/);
  });

  // The brief was visuals only: where the wash sits, how tall it is and how it
  // stacks are the consumer's decisions, so none of them belong in the recipe.
  it("owns no box, no position and no stacking", () => {
    expect(css).not.toMatch(/(^|[\s;{])position:/);
    expect(css).not.toMatch(/z-index:/);
    expect(css).not.toMatch(/background-attachment:/);
    expect(css).not.toMatch(/(^|[\s;{])(width|height|inset|top|left|right|bottom):/);
  });

  it("only uses tokens that tokens.css defines", () => {
    for (const token of [
      "--font-text",
      "--font-size-base",
      "--line-height-body",
      "--color-text",
      "--color-body-bg",
      "--tint-blue-10",
      "--tint-green-5",
      "--color-blue",
      "--color-green",
    ]) {
      expect(css).toContain(`var(${token})`);
      expect(tokensCss).toContain(`${token}:`);
    }
  });
});
