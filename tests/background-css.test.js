import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Off disk, since Vitest resolves a CSS `?raw` import to an empty string.
const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(__dirname, "../src/foundation/background.css"), "utf8");
const tokensCss = readFileSync(join(__dirname, "../src/foundation/tokens.css"), "utf8");

describe("page surface stylesheet", () => {
  it("styles the page body from tokens", () => {
    expect(css).toMatch(/\.neuwo-body \{[^}]*font-family:\s*var\(--neuwo-font-text\)/);
    expect(css).toMatch(/\.neuwo-body \{[^}]*font-size:\s*var\(--neuwo-font-size-base\)/);
    expect(css).toMatch(/\.neuwo-body \{[^}]*line-height:\s*var\(--neuwo-line-height-body\)/);
    expect(css).toMatch(/\.neuwo-body \{[^}]*color:\s*var\(--neuwo-color-text\)/);
    expect(css).toMatch(/\.neuwo-body \{[^}]*background-color:\s*var\(--neuwo-color-body-bg\)/);
    expect(css).toMatch(/\.neuwo-body \{[^}]*-webkit-font-smoothing:\s*antialiased/);
    expect(css).toMatch(/\.neuwo-body \{[^}]*-moz-osx-font-smoothing:\s*grayscale/);
  });

  // Copied from the main website, so a change there fails here instead of drifting unseen.
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
    const gradient = css.slice(css.indexOf(".neuwo-background__gradient"));
    expect(gradient).toContain("var(--neuwo-tint-blue-10)");
    expect(gradient).toContain("color-mix(in srgb, var(--neuwo-color-green) 7%, transparent)");
    expect(gradient).toContain("color-mix(in srgb, var(--neuwo-color-blue) 6%, transparent)");
    expect(gradient).toContain("var(--neuwo-tint-green-5)");
  });

  it("carries no raw colour literal", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/rgba?\(/);
  });

  it("owns no box, no position and no stacking", () => {
    expect(css).not.toMatch(/(^|[\s;{])position:/);
    expect(css).not.toMatch(/z-index:/);
    expect(css).not.toMatch(/background-attachment:/);
    expect(css).not.toMatch(/(^|[\s;{])(width|height|inset|top|left|right|bottom):/);
  });

  it("only uses tokens that tokens.css defines", () => {
    for (const token of [
      "--neuwo-font-text",
      "--neuwo-font-size-base",
      "--neuwo-line-height-body",
      "--neuwo-color-text",
      "--neuwo-color-body-bg",
      "--neuwo-tint-blue-10",
      "--neuwo-tint-green-5",
      "--neuwo-color-blue",
      "--neuwo-color-green",
    ]) {
      expect(css).toContain(`var(${token})`);
      expect(tokensCss).toContain(`${token}:`);
    }
  });
});
