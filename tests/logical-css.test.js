import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { LIGHT_COMPONENT_CSS } from "../scripts/light-css.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const PHYSICAL = [
  /^(left|right)$/,
  /^(margin|padding|scroll-margin|scroll-padding)-(left|right)$/,
  /^border-(left|right)(-[a-z]+)?$/,
  /^border-(top|bottom)-(left|right)-radius$/,
];
const PHYSICAL_VALUE = [
  /^(text-align|float|clear):\s*(left|right)\b/,
  /^background-position(-x)?:[^;]*\b(left|right)\b/,
  /\btranslateX\(/,
  /\btranslate\(/,
  /\bscaleX\(/,
  /\bto (left|right)\b/,
];

const ALLOWED = {
  "src/components/badge/badge.css": {
    "left: -100%": "the shimmer is a decorative light sweep with no reading order, and its keyframes move it by transform",
    "transform: translateX(0)": "the shimmer sweep's start",
    "transform: translateX(calc(300% * 100 / var(--neuwo-badge-shimmer-width)))": "the shimmer sweep's end",
  },
  "src/components/cta/cta.css": {
    "transform: translateX(0) skewX(-15deg)": "the scan line is a decorative sweep with no reading order",
    "transform: translateX(800%) skewX(-15deg)": "the scan line sweep's end",
    "left: -30%": "the scan line starts off the band's left edge, where its keyframes begin",
  },
  "src/components/fields/field.css": {
    "transform: translateX(-1px)": "the error shake is symmetric, so it reads the same in either direction",
    "transform: translateX(2px)": "the error shake",
    "transform: translateX(-4px)": "the error shake",
    "transform: translateX(4px)": "the error shake",
  },
  "src/components/fields/range/range.css": {
    "background-image: linear-gradient(to right, var(--neuwo-color-blue), var(--neuwo-color-blue))": "a single colour, so its direction draws nothing",
    "background-position: right": "the right-to-left case itself: WebKit's track has no logical background position",
  },
  "src/components/notice/notice.css": {
    "left: 50%": "centring a top-centre or bottom-centre notice, which is the same in either direction",
    "transform: translateX(-50%)": "the centring's half-width step back",
  },
  "src/components/selection/segmented/segmented.css": {
    "left: 0": "the pill's origin for the script's physical offsetLeft translate, which already follows the options' order",
  },
};

/**
 * @param {string} css
 * @returns {string[]}
 */
function declarations(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/[;{}]/)
    .map((part) => part.trim().replace(/\s+/g, " "))
    .filter((part) => /^[a-z-]+\s*:/.test(part) && !/^[a-z-]+\s*:[a-z-]+\(/.test(part) && !part.includes("{"));
}

/**
 * @param {string} declaration
 * @returns {boolean}
 */
function physical(declaration) {
  const property = declaration.slice(0, declaration.indexOf(":")).trim();
  return PHYSICAL.some((pattern) => pattern.test(property)) || PHYSICAL_VALUE.some((pattern) => pattern.test(declaration));
}

describe("component recipes in either direction", () => {
  it("reads selectors and declarations, spotting physical inline sides and directional transforms", () => {
    expect(declarations(".a { left: 0; padding: 0 1px } .b:hover { color: red; }")).toEqual(["left: 0", "padding: 0 1px", "color: red"]);
    for (const declaration of ["right: 1px", "margin-left: 2px", "border-right-width: 1px", "border-top-left-radius: 2px", "text-align: left", "transform: translateX(2px)", "background-position: right"]) {
      expect(physical(declaration), declaration).toBe(true);
    }
    for (const declaration of ["inset-inline-end: 1px", "margin-inline-start: 2px", "text-align: start", "text-align: center", "transform: translateY(-50%) rotate(180deg)", "top: 50%", "inset: 0"]) {
      expect(physical(declaration), declaration).toBe(false);
    }
  });

  for (const file of LIGHT_COMPONENT_CSS) {
    it(`${file} uses logical inline properties, outside a justified list of physical ones`, () => {
      const found = declarations(readFileSync(join(root, file), "utf8")).filter(physical);
      expect([...new Set(found)].sort()).toEqual(Object.keys(ALLOWED[file] ?? {}).sort());
    });
  }
});
