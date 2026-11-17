import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TOKENS = join(dirname(fileURLToPath(import.meta.url)), "../src/foundation/tokens.css");

export const MARKER = "/* From `npm run tokens:fallback`:";

/** @typedef {{ r: number, g: number, b: number, a: number }} Rgba sRGB channels and alpha, 0 to 1, unclamped */

/**
 * The `--neuwo-*` declarations of the first `:root` block, values with their whitespace collapsed.
 * @param {string} css
 * @returns {Map<string, string>}
 */
export function tokensOf(css) {
  const open = css.indexOf(":root {");
  const body = css.slice(open, closingParen(css, css.indexOf("{", open), "{", "}"));
  /** @type {Map<string, string>} */
  const tokens = new Map();
  for (const [, name, value] of body.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/(--neuwo-[\w-]+):\s*([^;]+);/g)) {
    tokens.set(name, value.replace(/\s+/g, " ").replace(/\( /g, "(").replace(/ \)/g, ")").trim());
  }
  return tokens;
}

/**
 * @param {string} text
 * @param {number} from the index of the opening bracket
 * @param {string} open
 * @param {string} close
 */
function closingParen(text, from, open = "(", close = ")") {
  let depth = 0;
  for (let i = from; i < text.length; i++) {
    if (text[i] === open) depth++;
    else if (text[i] === close && --depth === 0) return i;
  }
  throw new Error(`unbalanced ${open} in ${text}`);
}

/**
 * Splits on commas outside brackets.
 * @param {string} text
 */
function splitArgs(text) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")") depth--;
    else if (text[i] === "," && depth === 0) {
      parts.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(text.slice(start).trim());
  return parts;
}

/** @param {number} channel linear-light */
const encode = (channel) => {
  const magnitude = Math.abs(channel);
  const encoded = magnitude <= 0.0031308 ? 12.92 * magnitude : 1.055 * magnitude ** (1 / 2.4) - 0.055;
  return Math.sign(channel) * encoded;
};

/**
 * Björn Ottosson's OKLab to linear sRGB, then the sRGB transfer function.
 * @param {number} lightness 0 to 1
 * @param {number} chroma
 * @param {number} hue degrees
 * @returns {[number, number, number]}
 */
export function oklchToSrgb(lightness, chroma, hue) {
  const a = chroma * Math.cos((hue * Math.PI) / 180);
  const b = chroma * Math.sin((hue * Math.PI) / 180);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    encode(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    encode(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    encode(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

/**
 * @param {string} text a number, a percentage of `whole`, or `none`
 * @param {number} whole
 */
const amount = (text, whole) => (text === "none" ? 0 : text.endsWith("%") ? (parseFloat(text) / 100) * whole : parseFloat(text));

/**
 * Resolves a colour expression of the forms the tokens use: `oklch()`, `color-mix(in srgb, ...)`, `var()` and
 * `transparent`.
 * @param {string} expression
 * @param {Map<string, string>} tokens
 * @returns {Rgba}
 */
export function resolve(expression, tokens) {
  const text = expression.trim();
  if (text === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  const call = /^([\w-]+)\(([\s\S]*)\)$/.exec(text);
  if (!call) throw new Error(`not a colour: ${text}`);
  const [, name, inner] = call;
  if (name === "var") {
    const value = tokens.get(inner.trim());
    if (value === undefined) throw new Error(`unknown token in ${text}`);
    return resolve(value, tokens);
  }
  if (name === "oklch") {
    const [channels, alpha = "1"] = inner.split("/").map((part) => part.trim());
    const [lightness, chroma, hue] = channels.split(/\s+/);
    const [r, g, b] = oklchToSrgb(amount(lightness, 1), amount(chroma, 0.4), amount(hue, 1));
    return { r, g, b, a: amount(alpha, 1) };
  }
  if (name === "color-mix") {
    const [space, ...colours] = splitArgs(inner);
    if (space !== "in srgb" || colours.length !== 2) throw new Error(`unsupported mix: ${text}`);
    const parsed = colours.map((part) => {
      const percent = /\s(\d+(?:\.\d+)?)%$/.exec(part);
      return { colour: resolve(percent ? part.slice(0, percent.index) : part, tokens), share: percent ? Number(percent[1]) / 100 : null };
    });
    const first = parsed[0].share ?? 1 - (parsed[1].share ?? 0.5);
    const second = parsed[1].share ?? 1 - first;
    const [x, y] = parsed.map(({ colour }) => colour);
    // Interpolated with premultiplied alpha, as CSS Color 5 mixes.
    const a = x.a * first + y.a * second;
    const channel = (/** @type {"r" | "g" | "b"} */ key) => (a === 0 ? 0 : (x[key] * x.a * first + y[key] * y.a * second) / a);
    return { r: channel("r"), g: channel("g"), b: channel("b"), a };
  }
  throw new Error(`unsupported colour function: ${text}`);
}

/** @param {Rgba} colour */
export function hex({ r, g, b, a }) {
  const byte = (/** @type {number} */ value) => Math.round(Math.min(1, Math.max(0, value)) * 255).toString(16).padStart(2, "0");
  return `#${byte(r)}${byte(g)}${byte(b)}${a < 1 ? byte(a) : ""}`;
}

/**
 * A token value with each `oklch()` and `color-mix()` in it replaced by its hex.
 * @param {string} value
 * @param {Map<string, string>} tokens
 */
export function inHex(value, tokens) {
  let out = "";
  let at = 0;
  for (const match of value.matchAll(/(oklch|color-mix)\(/g)) {
    if (match.index < at) continue;
    const end = closingParen(value, match.index + match[1].length);
    out += value.slice(at, match.index) + hex(resolve(value.slice(match.index, end + 1), tokens));
    at = end + 1;
  }
  return out + value.slice(at);
}

/**
 * The `@supports` block that gives every token built from `oklch()` or `color-mix()` a hex value.
 * @param {string} css the tokens sheet
 * @returns {string}
 */
export function colourFallbackCss(css) {
  const tokens = tokensOf(css);
  const lines = [...tokens]
    .filter(([, value]) => /(oklch|color-mix)\(/.test(value))
    .map(([name, value]) => `    ${name}: ${inHex(value, tokens)};`);
  return [
    `${MARKER} each colour token in hex, for browsers without oklch() or color-mix(), since a custom property cannot fall back by declaration order. */`,
    "@supports not ((color: oklch(0% 0 0)) and (color: color-mix(in srgb, red, red))) {",
    "  :root {",
    ...lines,
    "  }",
    "}",
    "",
  ].join("\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const css = readFileSync(TOKENS, "utf8");
  const at = css.indexOf(MARKER);
  const head = (at === -1 ? css : css.slice(0, at)).replace(/\n*$/, "\n\n");
  writeFileSync(TOKENS, head + colourFallbackCss(css));
}
