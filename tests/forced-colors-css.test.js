import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { LIGHT_COMPONENT_CSS } from "../scripts/light-css.js";
import { flatRules } from "./fixtures/css-rules.js";
import { closing } from "./fixtures/specificity.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(root, file), "utf8");
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** @param {string} css */
function outsideForced(css) {
  let out = css;
  for (let at = out.search(/@media \(forced-colors: active\)\s*\{/); at >= 0; at = out.search(/@media \(forced-colors: active\)\s*\{/)) {
    out = out.slice(0, at) + out.slice(closing(out, out.indexOf("{", at), "{", "}") + 1);
  }
  return out;
}

/** @param {string} file */
function forcedRules(file) {
  const css = strip(read(file));
  return Array.from(css.matchAll(/@media \(forced-colors: active\)\s*\{/g)).flatMap(({ index }) => {
    const open = css.indexOf("{", index);
    return flatRules(css.slice(open + 1, closing(css, open, "{", "}")));
  });
}

/**
 * @param {string} file
 * @param {string} selector
 */
const forced = (file, selector) => Object.fromEntries(forcedRules(file).find((rule) => rule.selectors.includes(selector))?.declarations ?? []);

describe("forced colours", () => {
  it("defines the focus outline that forced colours paint in place of the focus band: 2px, 2px out, transparent until then", () => {
    const tokens = read("src/foundation/tokens.css");
    expect(tokens).toContain("--neuwo-outline-focus: 2px solid transparent;");
    expect(tokens).toContain("--neuwo-outline-focus-offset: 2px;");
  });

  it("gives every focus ring a transparent outline, since forced colours drop the box-shadow ring and paint the outline", () => {
    let rings = 0;
    for (const file of LIGHT_COMPONENT_CSS) {
      const css = strip(read(file));
      const rules = flatRules(outsideForced(css));
      const ringedBox = (selector) => rules.some((rule) => rule.selectors.includes(`${selector}::after`) && rule.declarations.has("box-shadow"));
      for (const rule of rules) {
        const focused = rule.selectors.some((selector) => selector.includes(":focus-visible") && !/::[\w-]+$/.test(selector));
        if (!focused || !(rule.declarations.has("box-shadow") || rule.selectors.every(ringedBox))) continue;
        rings++;
        expect(rule.declarations.get("outline"), `${file} ${rule.selectors[0]}`).toBe("var(--neuwo-outline-focus)");
        expect(rule.declarations.get("outline-offset"), `${file} ${rule.selectors[0]}`).toBe("var(--neuwo-outline-focus-offset)");
      }
    }
    expect(rings).toBe(8);
  });

  it("removes an outline only from a focused element whose part inside takes the system's own ring, which forced colours paint", () => {
    let handed = 0;
    for (const file of LIGHT_COMPONENT_CSS) {
      const rules = flatRules(strip(read(file)));
      const outline = (rule) => rule.declarations.get("outline") ?? rule.declarations.get("outline-style");
      for (const rule of rules.filter((each) => /^(none|0)$/.test(outline(each) ?? ""))) {
        for (const selector of rule.selectors) {
          const inner = rules.filter((each) => outline(each) === "auto" && each.selectors.some((one) => one.startsWith(`${selector} > `)));
          expect(selector, `${file} ${selector}`).toMatch(/:focus-visible$/);
          expect(inner.length, `${file} ${selector}`).toBeGreaterThan(0);
          handed++;
        }
      }
    }
    expect(handed).toBe(1);
  });

  it("reads every forced colours block of a sheet", () => {
    const blocks = (file) => (strip(read(file)).match(/@media \(forced-colors: active\)/g) ?? []).length;
    for (const file of LIGHT_COMPONENT_CSS) {
      if (!blocks(file)) continue;
      const css = strip(read(file));
      const inside = Array.from(css.matchAll(/@media \(forced-colors: active\)\s*\{/g)).reduce((count, { index }) => {
        const open = css.indexOf("{", index);
        return count + (css.slice(open + 1, closing(css, open, "{", "}")).match(/\{/g) ?? []).length;
      }, 0);
      expect(forcedRules(file).length, file).toBe(inside);
    }
  });

  it("restates a system outline, without the ring, on a focusable control that a forced block opts out of forced colours", () => {
    let checked = 0;
    for (const file of LIGHT_COMPONENT_CSS) {
      const focusRings = flatRules(outsideForced(strip(read(file))))
        .flatMap((rule) => (rule.declarations.has("box-shadow") ? rule.selectors : []))
        .filter((selector) => /:focus-visible$/.test(selector));
      const forcedBlock = forcedRules(file);
      for (const rule of forcedBlock.filter((candidate) => candidate.declarations.get("forced-color-adjust") === "none")) {
        for (const selector of rule.selectors.filter((candidate) => !candidate.includes("::"))) {
          for (const ring of focusRings.filter((focus) => selector.startsWith(focus.replace(/:focus-visible$/, "")))) {
            checked++;
            const restated = forcedBlock.find((candidate) => candidate.selectors.includes(ring));
            expect(restated, `${file} ${ring}`).toBeDefined();
            expect(restated.declarations.get("outline-color"), ring).toMatch(/^(CanvasText|ButtonText|Highlight)$/);
            expect(restated.declarations.get("box-shadow"), ring).toBe("none");
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("marks the selected segmented option and its pill in the highlight colours, opted out of Chromium's text backplate, which would hide the label", () => {
    const file = "src/components/selection/segmented/segmented.css";
    expect(forced(file, '.neuwo-segmented__option[aria-checked="true"]')).toEqual({ "forced-color-adjust": "none", background: "Highlight", color: "HighlightText" });
    expect(forced(file, ".neuwo-segmented__indicator")).toEqual({ background: "Highlight" });
  });

  it("draws the range track in GrayText and its fill in Highlight, keeping WebKit's fill gradient that forced colours would drop", () => {
    const file = "src/components/fields/range/range.css";
    expect(forced(file, ".neuwo-range::-webkit-slider-runnable-track")).toEqual({
      "forced-color-adjust": "none",
      "background-color": "GrayText",
      "background-image": "linear-gradient(Highlight, Highlight)",
    });
    expect(forced(file, ".neuwo-range::-webkit-slider-thumb")).toEqual({ "forced-color-adjust": "auto" });
    expect(forced(file, ".neuwo-range::-moz-range-track")).toEqual({ background: "GrayText" });
    expect(forced(file, ".neuwo-range::-moz-range-progress")).toEqual({ background: "Highlight" });
  });

  it("marks the combobox's selected option with an inset ring as well, which tells it from the active one where the two colours match, and the active one, which wins, as a highlight", () => {
    const file = "src/components/fields/combobox/combobox.css";
    const rules = forcedRules(file);
    const selected = rules.findIndex((rule) => rule.selectors.includes('.neuwo-combobox__option[aria-selected="true"]'));
    const active = rules.findIndex((rule) => rule.selectors.includes(".neuwo-combobox__option.neuwo-combobox__option--active"));
    expect(Object.fromEntries(rules[selected].declarations)).toEqual({
      "forced-color-adjust": "none",
      background: "SelectedItem",
      color: "SelectedItemText",
      outline: "2px solid CanvasText",
      "outline-offset": "-2px",
    });
    expect(forced("src/components/popup.css", ":is(.neuwo-combobox__popup, .neuwo-menu)")).toEqual({ "color-scheme": "light dark" });
    expect(Object.fromEntries(rules[active].declarations)).toEqual({ "forced-color-adjust": "none", background: "Highlight", color: "HighlightText" });
    expect(active).toBeGreaterThan(selected);
  });

  it("draws the masked glyphs and the status dot in a system text colour, where the forced background would hide them", () => {
    expect(forced("src/components/fields/combobox/combobox.css", ".neuwo-combobox__chevron")).toEqual({ background: "CanvasText" });
    expect(forced("src/components/copy/copy.css", ".neuwo-copy__button::before")).toEqual({ background: "ButtonText" });
    expect(forced("src/components/notice/notice.css", ".neuwo-notice__dismiss::before")).toEqual({ background: "ButtonText" });
    expect(forced("src/components/status-dot/status-dot.css", ".neuwo-status-dot")).toEqual({ background: "CanvasText" });
  });
});
