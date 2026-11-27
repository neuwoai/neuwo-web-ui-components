import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { distFile } from "./setup/dist.js";
import { oklchToSrgb, resolve, tokensOf } from "../scripts/colour-fallback.js";
import { contrast } from "./fixtures/contrast.js";

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

describe("status colour tokens", () => {
  const tokens = tokensOf(tokensCss);
  const HUE = { success: 131.692, info: 217.1, warning: 80.297, error: 25.21 };
  const STEPS = ["400", "550", "700", "800", "900"];
  /** @param {string} name */
  const parts = (name) => {
    const [, l, c, h] = tokens.get(name).match(/^oklch\((\d+(?:\.\d+)?)% (\d\.\d{3}) (\d+(?:\.\d+)?)\)$/);
    return { l: Number(l), c: Number(c), h: Number(h) };
  };
  /** @param {string} name */
  const hueOf = (name) => Number(tokens.get(name).match(/ (\d+(?:\.\d+)?)\)$/)[1]);
  /** @param {string} status */
  const named = (status) => [...tokens.keys()].filter((name) => name === `--neuwo-color-${status}` || name.startsWith(`--neuwo-color-${status}-`));

  it("gives each status exactly the steps 400, 550, 700, 800 and 900, and no unnumbered base", () => {
    for (const status of Object.keys(HUE)) {
      expect(named(status), status).toEqual(STEPS.map((step) => `--neuwo-color-${status}-${step}`));
    }
  });

  it("names each step for its lightness, a tenth of the step, the same in every status", () => {
    for (const status of Object.keys(HUE)) {
      for (const step of STEPS) expect(parts(`--neuwo-color-${status}-${step}`).l, `${status}-${step}`).toBe(Number(step) / 10);
    }
  });

  it("keeps one hue per status: the brand green's, the brand blue's, the website amber's and the red's", () => {
    expect(HUE.success).toBe(hueOf("--neuwo-color-green"));
    expect(HUE.info).toBe(hueOf("--neuwo-color-blue"));
    expect(HUE.error).toBe(hueOf("--neuwo-color-red"));
    for (const status of Object.keys(HUE)) {
      for (const step of STEPS) expect(parts(`--neuwo-color-${status}-${step}`).h, `${status}-${step}`).toBe(HUE[status]);
    }
  });

  it("gives each step the most chroma sRGB holds, up to 0.21", () => {
    const outside = (rgb) => rgb.some((channel) => channel < 0 || channel > 1);
    for (const status of Object.keys(HUE)) {
      for (const step of STEPS) {
        const { l, c, h } = parts(`--neuwo-color-${status}-${step}`);
        expect(c, `${status}-${step}`).toBeLessThanOrEqual(0.21);
        expect(outside(oklchToSrgb(l / 100, c, h)), `${status}-${step}`).toBe(false);
        if (c < 0.21) expect(outside(oklchToSrgb(l / 100, c + 0.001, h)), `${status}-${step}`).toBe(true);
      }
    }
  });

  it("reads at 4.5 : 1 or more on the body background from 700 up, and 3 : 1 or more at 550", () => {
    const ground = resolve(tokens.get("--neuwo-color-body-bg"), tokens);
    for (const status of Object.keys(HUE)) {
      const ratio = (step) => contrast(resolve(tokens.get(`--neuwo-color-${status}-${step}`), tokens), ground);
      expect(ratio("550"), `${status}-550`).toBeGreaterThanOrEqual(3);
      for (const step of ["700", "800", "900"]) expect(ratio(step), `${status}-${step}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
