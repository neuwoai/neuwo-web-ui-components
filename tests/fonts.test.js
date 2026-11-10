import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { resolveFontUrls } from "../src/core/fonts.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fontsCss = readFileSync(join(__dirname, "../src/foundation/fonts.css"), "utf8");
const fontsJs = readFileSync(join(__dirname, "../src/core/fonts.js"), "utf8");
const WOFF2_URL = /url\(['"]?([^'")]+\.woff2)['"]?\)/g;
const fontFiles = [...new Set([...fontsCss.matchAll(WOFF2_URL)].map((m) => m[1]))];

describe("font URLs", () => {
  it("finds the woff2 files fonts.css declares", () => {
    expect(fontFiles).toEqual([
      "fonts/outfit-variable.woff2",
      "fonts/noto-sans-variable.woff2",
      "fonts/noto-sans-italic-variable.woff2",
    ]);
  });

  it("names each file as a literal URL a bundler can rewrite", () => {
    for (const rel of fontFiles) {
      expect(fontsJs).toContain(`"${rel}": new URL("./${rel}", import.meta.url).href`);
    }
  });

  it("ships each file the stylesheet points at", () => {
    for (const rel of fontFiles) {
      expect(existsSync(join(__dirname, "../src/foundation", rel))).toBe(true);
    }
  });
});

describe("fallback faces", () => {
  it.each(["Outfit Fallback", "Noto Sans Fallback"])("%s lists Arial and its metric-compatible equivalents in order", (family) => {
    const face = fontsCss.match(new RegExp(`@font-face\\s*{[^}]*font-family: '${family}';[^}]*}`))?.[0] ?? "";
    expect(face).toMatch(/src: local\('Arial'\), local\('Liberation Sans'\), local\('Arimo'\);/);
  });
});

describe("resolveFontUrls", () => {
  it("makes every woff2 URL absolute and keeps its file name", () => {
    const urls = [...resolveFontUrls(fontsCss).matchAll(WOFF2_URL)].map((m) => m[1]);
    expect(urls).toHaveLength([...fontsCss.matchAll(WOFF2_URL)].length);
    for (const url of urls) {
      expect(URL.canParse(url)).toBe(true);
      expect(fontFiles.some((rel) => url.endsWith(`/${rel}`))).toBe(true);
    }
  });

  it("changes nothing but the woff2 URLs", () => {
    const strip = (css) => css.replace(WOFF2_URL, "url()");
    expect(strip(resolveFontUrls(fontsCss))).toBe(strip(fontsCss));
  });
});
