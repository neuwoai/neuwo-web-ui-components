import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { brotliDecompressSync } from "node:zlib";
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

/** @param {string} family */
const facesOf = (family) => [...fontsCss.matchAll(new RegExp(`@font-face\\s*{[^}]*font-family: '${family}';[^}]*}`, "g"))].map(([face]) => face);

/**
 * The vertical metrics of a woff2 file, read from its `head` and `hhea` tables, which woff2 never transforms.
 * @param {string} file
 */
function verticalMetrics(file) {
  const buf = readFileSync(join(__dirname, "../src/foundation", file));
  const known = ["cmap", "head", "hhea"];
  let at = 48;
  const base128 = () => {
    let value = 0;
    for (let byte = 0x80; byte & 0x80; ) {
      byte = buf[at++];
      value = value * 128 + (byte & 0x7f);
    }
    return value;
  };
  const tables = [];
  for (let index = 0; index < buf.readUInt16BE(12); index++) {
    const flags = buf[at++];
    const tag = (flags & 0x3f) === 63 ? buf.toString("latin1", at, (at += 4)) : (known[flags & 0x3f] ?? String(flags & 0x3f));
    const length = base128();
    const version = flags >> 6;
    const transformed = (flags & 0x3f) === 10 || (flags & 0x3f) === 11 ? version !== 3 : version !== 0;
    tables.push({ tag, length: transformed ? base128() : length });
  }
  const data = brotliDecompressSync(buf.subarray(at, at + buf.readUInt32BE(20)));
  const table = (tag) => {
    let offset = 0;
    for (const entry of tables) {
      if (entry.tag === tag) return data.subarray(offset, offset + entry.length);
      offset += entry.length;
    }
    throw new Error(`${file} has no ${tag}`);
  };
  const head = table("head");
  const hhea = table("hhea");
  return { unitsPerEm: head.readUInt16BE(18), ascender: hhea.readInt16BE(4), descender: hhea.readInt16BE(6), lineGap: hhea.readInt16BE(8) };
}

describe("fallback faces", () => {
  it.each(["Outfit Fallback", "Noto Sans Fallback"])("%s lists Arial and its metric-compatible equivalents in order", (family) => {
    const [regular, bold] = facesOf(family);
    expect(regular).toMatch(/src: local\('Arial'\), local\('Liberation Sans'\), local\('Arimo'\), local\('Arimo Regular'\);/);
    expect(bold).toMatch(/src: local\('Arial Bold'\), local\('Arial-BoldMT'\), local\('Liberation Sans Bold'\), local\('Arimo Bold'\);/);
  });

  it.each(["Outfit Fallback", "Noto Sans Fallback"])("%s takes Arial below weight 550 and Arial Bold from it, so bold text is never synthesised", (family) => {
    expect(facesOf(family).map((face) => face.match(/font-weight: ([\d ]+);/)?.[1])).toEqual(["100 549", "550 900"]);
  });

  it.each([
    ["Outfit Fallback", "fonts/outfit-variable.woff2"],
    ["Noto Sans Fallback", "fonts/noto-sans-variable.woff2"],
  ])("%s gives the web font's ascent, descent and line gap at its adjusted size", (family, file) => {
    const metrics = verticalMetrics(file);
    for (const face of facesOf(family)) {
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
