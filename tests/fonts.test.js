import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { resolveFontUrls } from "../src/core/fonts.js";
import { fallbackCss, readTables } from "../scripts/fallback-metrics.js";

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

/**
 * @param {string} family
 * @param {"normal" | "italic"} [style]
 */
const facesOf = (family, style = "normal") =>
  [...fontsCss.matchAll(new RegExp(`@font-face\\s*{[^}]*font-family: '${family}';[^}]*}`, "g"))]
    .map(([face]) => face)
    .filter((face) => face.includes("font-style: italic") === (style === "italic"));

const REGULAR = "src: local('Arial'), local('Liberation Sans'), local('Arimo'), local('Arimo Regular');";
const BOLD = "src: local('Arial Bold'), local('Arial-BoldMT'), local('Liberation Sans Bold'), local('Arimo Bold');";
const ITALIC = "src: local('Arial Italic'), local('Arial-ItalicMT'), local('Liberation Sans Italic'), local('Arimo Italic');";
const BOLD_ITALIC = "src: local('Arial Bold Italic'), local('Arial-BoldItalicMT'), local('Liberation Sans Bold Italic'), local('Arimo Bold Italic');";

/**
 * @param {string} file
 */
function verticalMetrics(file) {
  const { head, hhea } = readTables(join(__dirname, "../src/foundation", file));
  return { unitsPerEm: head.readUInt16BE(18), ascender: hhea.readInt16BE(4), descender: hhea.readInt16BE(6), lineGap: hhea.readInt16BE(8) };
}

describe("fallback faces", () => {
  it("are the ones scripts/fallback-metrics.js computes from the woff2 files", () => {
    expect(fontsCss.endsWith(fallbackCss())).toBe(true);
  });

  it.each(["Outfit Fallback", "Noto Sans Fallback"])("%s has a face per token weight, meeting at the midpoints, Arial up to 500 and Arial Bold from 600", (family) => {
    const faces = facesOf(family);
    expect(faces.map((face) => face.match(/font-weight: ([\d ]+);/)?.[1])).toEqual(["100 449", "450 549", "550 649", "650 749", "750 900"]);
    expect(faces.map((face) => (face.includes(REGULAR) ? "regular" : face.includes(BOLD) ? "bold" : "none"))).toEqual(["regular", "regular", "bold", "bold", "bold"]);
  });

  it("Noto Sans Fallback has an italic face for 400 and one for 700, split at 550, from Arial Italic and Arial Bold Italic", () => {
    const faces = facesOf("Noto Sans Fallback", "italic");
    expect(faces.map((face) => face.match(/font-weight: ([\d ]+);/)?.[1])).toEqual(["100 549", "550 900"]);
    expect([faces[0].includes(ITALIC), faces[1].includes(BOLD_ITALIC)]).toEqual([true, true]);
  });

  it.each([
    ["Outfit Fallback", "normal", "fonts/outfit-variable.woff2"],
    ["Noto Sans Fallback", "normal", "fonts/noto-sans-variable.woff2"],
    ["Noto Sans Fallback", "italic", "fonts/noto-sans-italic-variable.woff2"],
  ])("%s, %s, gives the web font's ascent, descent and line gap at each face's adjusted size", (family, style, file) => {
    const metrics = verticalMetrics(file);
    const faces = facesOf(family, /** @type {"normal" | "italic"} */ (style));
    expect(faces.length).toBeGreaterThan(1);
    for (const face of faces) {
      const share = (name) => Number(face.match(new RegExp(`${name}: ([\\d.]+)%;`))?.[1]) / 100;
      const size = share("size-adjust");
      expect(share("ascent-override") * size).toBeCloseTo(metrics.ascender / metrics.unitsPerEm, 3);
      expect(share("descent-override") * size).toBeCloseTo(-metrics.descender / metrics.unitsPerEm, 3);
      expect(share("line-gap-override") * size).toBeCloseTo(metrics.lineGap / metrics.unitsPerEm, 3);
    }
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
