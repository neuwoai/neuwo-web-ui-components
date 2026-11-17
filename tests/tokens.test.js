import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { distFile } from "./setup/dist.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tokensCss = readFileSync(join(__dirname, "../src/foundation/tokens.css"), "utf8");

describe("error tokens", () => {
  it("defines a red tint and a danger focus ring built from --neuwo-color-red", () => {
    expect(tokensCss).toContain("--neuwo-tint-red-20:");
    expect(tokensCss).toContain("color-mix(in srgb, var(--neuwo-color-red) 20%, transparent)");
    expect(tokensCss).toContain("--neuwo-shadow-danger:");
    expect(tokensCss).toContain("--neuwo-shadow-danger: 0 0 0 3px var(--neuwo-tint-red-20)");
  });
});

describe("control tokens", () => {
  it("defines a single disabled-opacity token used across controls", () => {
    expect(tokensCss).toContain("--neuwo-opacity-disabled: 0.4");
  });
});

describe("font-size tokens", () => {
  it("defines --neuwo-font-size-2xs at 0.625rem for the compact badge size", () => {
    expect(tokensCss).toContain("--neuwo-font-size-2xs: 0.625rem");
  });
});

describe("font-family tokens", () => {
  it("defines --neuwo-font-mono as the shipped JetBrains Mono, then its fallback face and the system stack", () => {
    expect(tokensCss).toContain(
      "--neuwo-font-mono: 'JetBrains Mono', 'JetBrains Mono Fallback', ui-monospace, 'SF Mono', Consolas, monospace;"
    );
  });
});

describe("font-weight tokens", () => {
  it("defines --neuwo-font-weight-medium at 500", () => {
    expect(tokensCss).toContain("--neuwo-font-weight-medium: 500");
  });
  it("defines --neuwo-font-weight-semibold at 600", () => {
    expect(tokensCss).toContain("--neuwo-font-weight-semibold: 600");
  });
});

describe("shimmer keyframes", () => {
  it("ships neuwo-shimmer beside the shimmer gradient, sweeping its doubled width from right to left", () => {
    expect(tokensCss).toMatch(
      /@keyframes neuwo-shimmer \{\s*0% \{ background-position: 200% center; \}\s*100% \{ background-position: -200% center; \}\s*\}/,
    );
  });

  it("names the keyframes in the recipe that sits above the gradient", () => {
    expect(tokensCss).toContain(
      "/* Pair with `background-size: 200% 100%` and `animation: neuwo-shimmer 4s ease-in-out infinite` for the looping accent. */",
    );
    expect(tokensCss).not.toMatch(/animation: shimmer\b/);
  });

  it("is in both bundles that carry the gradient", () => {
    for (const bundle of ["neuwo.css", "neuwo-components.css"]) {
      const css = readFileSync(distFile(bundle), "utf8");
      expect(css, bundle).toContain("--neuwo-gradient-accent-shimmer:");
      expect(css, bundle).toContain("@keyframes neuwo-shimmer");
    }
  });
});
