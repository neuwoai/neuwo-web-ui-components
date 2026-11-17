import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { MARKER, colourFallbackCss, hex, resolve, tokensOf } from "../scripts/colour-fallback.js";
import { distFile } from "./setup/dist.js";

const tokensCss = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../src/foundation/tokens.css"), "utf8");
const tokens = tokensOf(tokensCss);
const block = tokensCss.slice(tokensCss.indexOf(MARKER));
/** @param {string} name */
const fallback = (name) => block.match(new RegExp(`^ {4}${name}: ([^;]+);$`, "m"))?.[1];

describe("colour token fallbacks", () => {
  it("end tokens.css with the block `npm run tokens:fallback` computes", () => {
    expect(tokensCss.endsWith(colourFallbackCss(tokensCss))).toBe(true);
  });

  it("apply only where oklch() or color-mix() is missing, choosing by @supports since a custom property never falls back", () => {
    expect(block).toContain("@supports not ((color: oklch(0% 0 0)) and (color: color-mix(in srgb, red, red))) {\n  :root {\n");
  });

  it("give every token built from oklch() or color-mix() a value with neither in it", () => {
    const built = [...tokens].filter(([, value]) => /(oklch|color-mix)\(/.test(value)).map(([name]) => name);
    expect(built.length).toBeGreaterThan(0);
    for (const name of built) {
      expect(fallback(name), name).toBeDefined();
      expect(fallback(name), name).not.toMatch(/oklch|color-mix|var\(/);
    }
    expect([...block.matchAll(/^ {4}(--neuwo-[\w-]+):/gm)].map(([, name]) => name)).toEqual(built);
  });

  it.each([
    ["--neuwo-color-blue", "#0aa5c3"],
    ["--neuwo-color-white", "#f1f5f9"],
    ["--neuwo-color-grey-50", "#0f172a"],
    ["--neuwo-color-grey-200", "#1e293b"],
    ["--neuwo-color-grey-300", "#334155"],
    ["--neuwo-color-grey-400", "#94a3b8"],
    ["--neuwo-color-grey-500", "#64748b"],
    ["--neuwo-color-grey-600", "#cbd5e1"],
    ["--neuwo-color-grey-700", "#e2e8f0"],
    ["--neuwo-color-grey-800", "#f1f5f9"],
    ["--neuwo-color-grey-900", "#f8fafc"],
  ])("converts %s to %s, the hex the brand and Tailwind's slate scale publish", (name, expected) => {
    expect(fallback(name)).toBe(expected);
  });

  it("mixes a tint as its colour at the tint's alpha, as color-mix with transparent does", () => {
    expect(fallback("--neuwo-tint-blue-20")).toBe("#0aa5c333");
    expect(fallback("--neuwo-tint-red-20")).toBe(`${fallback("--neuwo-color-red")}33`);
    expect(fallback("--neuwo-tint-green-5")).toBe(`${fallback("--neuwo-color-green")}0d`);
  });

  it("keeps a gradient's and a shadow's shape, swapping only the colours", () => {
    expect(fallback("--neuwo-gradient-accent")).toBe("linear-gradient(135deg, #0c99b5 0 10%, #7fbb45 90% 100%)");
    expect(fallback("--neuwo-shadow-sm")).toBe("0 0.0625rem 0.125rem #0000004d");
    expect(fallback("--neuwo-color-shimmer")).toBe("#ffffff40");
  });

  it("finds every colour inside sRGB, so no fallback is clipped", () => {
    for (const [name, value] of tokens) {
      if (!/^(oklch|color-mix)\(/.test(value)) continue;
      const colour = resolve(value, tokens);
      for (const channel of [colour.r, colour.g, colour.b]) {
        expect(channel, name).toBeGreaterThan(-0.0005);
        expect(channel, name).toBeLessThan(1.0005);
      }
    }
  });

  it("writes opaque colours as six digits and translucent ones as eight", () => {
    expect(hex({ r: 1, g: 0, b: 0.5, a: 1 })).toBe("#ff0080");
    expect(hex({ r: 0, g: 0, b: 0, a: 0.3 })).toBe("#0000004d");
  });

  it("ships in every sheet that carries the tokens", () => {
    for (const sheet of ["neuwo.css", "neuwo-components.css", "foundation/tokens.css"]) {
      expect(readFileSync(distFile(sheet), "utf8"), sheet).toContain(MARKER);
    }
  });
});
