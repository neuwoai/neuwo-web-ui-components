import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliDecompressSync } from "node:zlib";

const FONTS = join(dirname(fileURLToPath(import.meta.url)), "../src/foundation/fonts");

// The woff2 known-table tags, in the order of their flag index.
const KNOWN = (
  "cmap head hhea hmtx maxp name OS/2 post cvt_ fpgm glyf loca prep CFF_ VORG EBDT EBLC gasp hdmx kern LTSH PCLT VDMX " +
  "vhea vmtx BASE GDEF GPOS GSUB EBSC JSTF MATH CBDT CBLC COLR CPAL SVG_ sbix acnt avar bdat bloc bsln cvar fdsc feat " +
  "fmtx fvar gvar hsty just lcar mort morx opbd prop trak Zapf Silf Glat Gloc Feat Sill"
)
  .split(" ")
  .map((tag) => tag.replace("_", " "));

/**
 * English letter frequencies in percent (Wikipedia, "Letter frequency"), the weighting of an average advance width.
 * @type {Record<string, number>}
 */
export const LETTERS = {
  a: 8.2, b: 1.5, c: 2.8, d: 4.3, e: 12.7, f: 2.2, g: 2.0, h: 6.1, i: 7.0, j: 0.15, k: 0.77, l: 4.0, m: 2.4, n: 6.7,
  o: 7.5, p: 1.9, q: 0.095, r: 6.0, s: 6.3, t: 9.1, u: 2.8, v: 0.98, w: 2.4, x: 0.15, y: 2.0, z: 0.074,
};

/** The share of characters that are spaces in that weighting. */
export const SPACE = 0.18;

// Arial is Capsize's published figure, which this weighting gives Liberation Sans as 904.2; the others are measured from Liberation Sans Bold, Italic and Bold Italic, metric-compatible with Arial's.
export const REFERENCES = { regular: 904, bold: 977.7, italic: 904.2, boldItalic: 977.7 };

const ARIAL_UNITS = 2048;

const SOURCES = {
  regular: "local('Arial'), local('Liberation Sans'), local('Arimo'), local('Arimo Regular')",
  bold: "local('Arial Bold'), local('Arial-BoldMT'), local('Liberation Sans Bold'), local('Arimo Bold')",
  italic: "local('Arial Italic'), local('Arial-ItalicMT'), local('Liberation Sans Italic'), local('Arimo Italic')",
  boldItalic: "local('Arial Bold Italic'), local('Arial-BoldItalicMT'), local('Liberation Sans Bold Italic'), local('Arimo Bold Italic')",
};

const UPRIGHT = /** @type {const} */ ([
  [400, "100 449"],
  [500, "450 549"],
  [600, "550 649"],
  [700, "650 749"],
  [800, "750 900"],
]);
const ITALIC = /** @type {const} */ ([
  [400, "100 549"],
  [700, "550 900"],
]);

export const FALLBACKS = [
  { family: "Outfit Fallback", file: "outfit-variable.woff2", italic: false, faces: UPRIGHT },
  { family: "Noto Sans Fallback", file: "noto-sans-variable.woff2", italic: false, faces: UPRIGHT },
  { family: "Noto Sans Fallback", file: "noto-sans-italic-variable.woff2", italic: true, faces: ITALIC },
];

/**
 * The tables of a woff2 file, or of a TrueType or OpenType file, by tag. A table woff2 transforms, `glyf` and `loca`
 * in these files, is left out, since only its transformed form is stored.
 * @param {string} file
 * @returns {Record<string, Buffer>}
 */
export function readTables(file) {
  const buf = readFileSync(file);
  /** @type {Record<string, Buffer>} */
  const tables = {};
  if (buf.toString("latin1", 0, 4) !== "wOF2") {
    for (let index = 0; index < buf.readUInt16BE(4); index++) {
      const record = 12 + index * 16;
      const offset = buf.readUInt32BE(record + 8);
      tables[buf.toString("latin1", record, record + 4)] = buf.subarray(offset, offset + buf.readUInt32BE(record + 12));
    }
    return tables;
  }
  let at = 48;
  const base128 = () => {
    let value = 0;
    for (let byte = 0x80; byte & 0x80; ) {
      byte = buf[at++];
      value = value * 128 + (byte & 0x7f);
    }
    return value;
  };
  const entries = [];
  for (let index = 0; index < buf.readUInt16BE(12); index++) {
    const flags = buf[at++];
    const known = flags & 0x3f;
    const tag = known === 63 ? buf.toString("latin1", at, (at += 4)) : KNOWN[known];
    const length = base128();
    const version = flags >> 6;
    const transformed = tag === "glyf" || tag === "loca" ? version !== 3 : version !== 0;
    entries.push({ tag, transformed, length: transformed ? base128() : length });
  }
  const data = brotliDecompressSync(buf.subarray(at, at + buf.readUInt32BE(20)));
  let offset = 0;
  for (const { tag, transformed, length } of entries) {
    if (!transformed) tables[tag] = data.subarray(offset, offset + length);
    offset += length;
  }
  return tables;
}

/**
 * @param {Buffer} cmap
 * @returns {(code: number) => number}
 */
function glyphs(cmap) {
  const records = Array.from({ length: cmap.readUInt16BE(2) }, (_, index) => ({
    platform: cmap.readUInt16BE(4 + index * 8),
    encoding: cmap.readUInt16BE(6 + index * 8),
    offset: cmap.readUInt32BE(8 + index * 8),
  }));
  const record =
    records.find((r) => r.platform === 3 && r.encoding === 10) ??
    records.find((r) => r.platform === 0 && r.encoding === 4) ??
    records.find((r) => r.platform === 3 && r.encoding === 1) ??
    records.find((r) => r.platform === 0);
  if (!record) throw new Error("no Unicode cmap");
  const table = cmap.subarray(record.offset);
  const format = table.readUInt16BE(0);
  if (format === 12) {
    return (code) => {
      for (let group = 0; group < table.readUInt32BE(12); group++) {
        const at = 16 + group * 12;
        if (code >= table.readUInt32BE(at) && code <= table.readUInt32BE(at + 4)) return table.readUInt32BE(at + 8) + code - table.readUInt32BE(at);
      }
      return 0;
    };
  }
  if (format !== 4) throw new Error(`cmap format ${format}`);
  const segments = table.readUInt16BE(6) / 2;
  const ends = 14;
  const starts = ends + segments * 2 + 2;
  const deltas = starts + segments * 2;
  const ranges = deltas + segments * 2;
  return (code) => {
    for (let segment = 0; segment < segments; segment++) {
      const start = table.readUInt16BE(starts + segment * 2);
      if (code < start || code > table.readUInt16BE(ends + segment * 2)) continue;
      const delta = table.readInt16BE(deltas + segment * 2);
      const range = table.readUInt16BE(ranges + segment * 2);
      if (range === 0) return (code + delta) & 0xffff;
      const glyph = table.readUInt16BE(ranges + segment * 2 + range + (code - start) * 2);
      return glyph ? (glyph + delta) & 0xffff : 0;
    }
    return 0;
  };
}

/**
 * The normalised coordinate of a weight on the `wght` axis, mapped through `avar` when the font has one.
 * @param {Record<string, Buffer>} tables
 * @param {number} weight
 * @returns {{ axis: number, axes: number, coordinate: number }}
 */
export function normalise(tables, weight) {
  const fvar = tables.fvar;
  const axes = fvar.readUInt16BE(8);
  let axis = -1;
  let coordinate = 0;
  for (let index = 0; index < axes; index++) {
    const at = fvar.readUInt16BE(4) + index * fvar.readUInt16BE(10);
    if (fvar.toString("latin1", at, at + 4) !== "wght") continue;
    const [min, def, max] = [4, 8, 12].map((field) => fvar.readInt32BE(at + field) / 65536);
    const value = Math.min(max, Math.max(min, weight));
    axis = index;
    coordinate = value < def ? (value - def) / (def - min) : value > def ? (value - def) / (max - def) : 0;
  }
  const avar = tables.avar;
  if (avar) {
    let at = 8;
    for (let index = 0; index < axes; index++) {
      const pairs = avar.readUInt16BE(at);
      const map = Array.from({ length: pairs }, (_, pair) => [avar.readInt16BE(at + 2 + pair * 4) / 16384, avar.readInt16BE(at + 4 + pair * 4) / 16384]);
      at += 2 + pairs * 4;
      if (index !== axis) continue;
      for (let pair = 1; pair < map.length; pair++) {
        const [from0, to0] = map[pair - 1];
        const [from1, to1] = map[pair];
        if (coordinate > from1) continue;
        coordinate = from1 === from0 ? to1 : to0 + ((coordinate - from0) * (to1 - to0)) / (from1 - from0);
        break;
      }
    }
  }
  return { axis, axes, coordinate };
}

/**
 * The `HVAR` advance width delta of a glyph at the given normalised coordinates.
 * @param {Buffer} hvar
 * @param {number} glyph
 * @param {number[]} coordinates
 * @returns {number}
 */
function advanceDelta(hvar, glyph, coordinates) {
  let outer = 0;
  let inner = glyph;
  const mapAt = hvar.readUInt32BE(8);
  if (mapAt) {
    const map = hvar.subarray(mapAt);
    const format = map[1];
    const count = map[0] === 0 ? map.readUInt16BE(2) : map.readUInt32BE(2);
    const innerBits = (format & 0x0f) + 1;
    const size = ((format & 0x30) >> 4) + 1;
    const at = (map[0] === 0 ? 4 : 6) + Math.min(glyph, count - 1) * size;
    let entry = 0;
    for (let byte = 0; byte < size; byte++) entry = entry * 256 + map[at + byte];
    outer = entry >>> innerBits;
    inner = entry & ((1 << innerBits) - 1);
  }
  const store = hvar.subarray(hvar.readUInt32BE(4));
  const regions = store.subarray(store.readUInt32BE(2));
  const axisCount = regions.readUInt16BE(0);
  const data = store.subarray(store.readUInt32BE(8 + outer * 4));
  const regionCount = data.readUInt16BE(4);
  const long = Boolean(data.readUInt16BE(2) & 0x8000);
  const words = data.readUInt16BE(2) & 0x7fff;
  const row = (long ? words * 4 + (regionCount - words) * 2 : words * 2 + (regionCount - words)) * inner;
  let at = 6 + regionCount * 2 + row;
  let delta = 0;
  for (let index = 0; index < regionCount; index++) {
    let value;
    if (index < words) {
      value = long ? data.readInt32BE(at) : data.readInt16BE(at);
      at += long ? 4 : 2;
    } else {
      value = long ? data.readInt16BE(at) : data.readInt8(at);
      at += long ? 2 : 1;
    }
    const region = data.readUInt16BE(6 + index * 2);
    let scalar = 1;
    for (let axis = 0; axis < axisCount; axis++) {
      const base = 4 + (region * axisCount + axis) * 6;
      const [start, peak, end] = [0, 2, 4].map((field) => regions.readInt16BE(base + field) / 16384);
      const coordinate = coordinates[axis] ?? 0;
      if (peak === 0 || start > peak || peak > end || (start < 0 && end > 0)) continue;
      if (coordinate < start || coordinate > end) {
        scalar = 0;
        break;
      }
      if (coordinate !== peak) scalar *= coordinate < peak ? (coordinate - start) / (peak - start) : (end - coordinate) / (end - peak);
    }
    delta += scalar * value;
  }
  return delta;
}

/**
 * The vertical metrics of a font and its average advance width at a weight, in the font's own units.
 * @param {Record<string, Buffer>} tables
 * @param {number | null} weight null for a static font
 */
export function measure(tables, weight) {
  const numberOfMetrics = tables.hhea.readUInt16BE(34);
  const glyphOf = glyphs(tables.cmap);
  const coordinates = [];
  if (weight !== null && tables.fvar && tables.HVAR) {
    const { axis, axes, coordinate } = normalise(tables, weight);
    for (let index = 0; index < axes; index++) coordinates.push(index === axis ? coordinate : 0);
  }
  /** @param {string} char */
  const advance = (char) => {
    const glyph = glyphOf(/** @type {number} */ (char.codePointAt(0)));
    const width = tables.hmtx.readUInt16BE(Math.min(glyph, numberOfMetrics - 1) * 4);
    return width + (coordinates.length ? advanceDelta(tables.HVAR, glyph, coordinates) : 0);
  };
  const total = Object.values(LETTERS).reduce((sum, share) => sum + share, 0);
  let average = advance(" ") * SPACE;
  for (const [char, share] of Object.entries(LETTERS)) average += advance(char) * (share / total) * (1 - SPACE);
  return {
    unitsPerEm: tables.head.readUInt16BE(18),
    ascender: tables.hhea.readInt16BE(4),
    descender: tables.hhea.readInt16BE(6),
    lineGap: tables.hhea.readInt16BE(8),
    average,
  };
}

/** @param {number} share */
const percent = (share) => `${Number((share * 100).toFixed(2))}%`;

/**
 * The fallback `@font-face` rules, with the comment that names their method, as `fonts.css` ends with them.
 * @returns {string}
 */
export function fallbackCss() {
  const rules = [];
  for (const { family, file, italic, faces } of FALLBACKS) {
    const tables = readTables(join(FONTS, file));
    for (const [weight, range] of faces) {
      const font = measure(tables, weight);
      const bold = weight >= 600;
      const kind = italic ? (bold ? "boldItalic" : "italic") : bold ? "bold" : "regular";
      const size = font.average / font.unitsPerEm / (REFERENCES[kind] / ARIAL_UNITS);
      rules.push(
        [
          "@font-face {",
          `  font-family: '${family}';`,
          ...(italic ? ["  font-style: italic;"] : []),
          `  font-weight: ${range};`,
          `  src: ${SOURCES[kind]};`,
          `  size-adjust: ${percent(size)};`,
          `  ascent-override: ${percent(font.ascender / font.unitsPerEm / size)};`,
          `  descent-override: ${percent(-font.descender / font.unitsPerEm / size)};`,
          `  line-gap-override: ${percent(font.lineGap / font.unitsPerEm / size)};`,
          "}",
        ].join("\n"),
      );
    }
  }
  const comment =
    "/* From `npm run fonts:fallback`: Capsize's method, each face sized to the font at its token weight by advance widths weighted by English letter frequency with spaces as 18% of characters, against Arial (2048 units, ascent 1854, descent 434, line gap 67, average width 904), Arial Bold (977.7) and their italics. */";
  return `${[comment, ...rules].join("\n\n")}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const reference = process.argv.indexOf("--reference");
  if (reference > 0) {
    const font = measure(readTables(process.argv[reference + 1]), null);
    console.log(`average width ${font.average.toFixed(1)} of ${font.unitsPerEm} units, ascent ${font.ascender}, descent ${font.descender}, line gap ${font.lineGap}`);
  } else process.stdout.write(fallbackCss());
}
