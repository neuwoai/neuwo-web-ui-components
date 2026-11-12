import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { LIGHT_COMPONENT_CSS } from "../scripts/light-css.js";
import { flatRules } from "./fixtures/css-rules.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(root, file), "utf8");
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** @param {string} file */
const forcedRules = (file) => flatRules(strip(read(file)).match(/@media \(forced-colors: active\) \{([\s\S]*?\})\s*\}/)?.[1] ?? "");

/**
 * @param {string} file
 * @param {string} selector
 */
const forced = (file, selector) => Object.fromEntries(forcedRules(file).find((rule) => rule.selectors.includes(selector))?.declarations ?? []);

describe("forced colours", () => {
  it("defines the focus outline from the focus ring's geometry: a 2px ring 2px out, transparent until forced colours paint it", () => {
    const tokens = read("src/foundation/tokens.css");
    expect(tokens).toContain("--neuwo-shadow-focus: 0 0 0 2px var(--neuwo-color-body-bg), 0 0 0 4px var(--neuwo-color-blue);");
    expect(tokens).toContain("--neuwo-outline-focus: 2px solid transparent;");
    expect(tokens).toContain("--neuwo-outline-focus-offset: 2px;");
  });

  it("gives every focus ring a transparent outline, since forced colours drop the box-shadow ring and paint the outline", () => {
    let rings = 0;
    for (const file of LIGHT_COMPONENT_CSS) {
      const css = strip(read(file));
      expect(css, file).not.toMatch(/outline:\s*(none|0)\s*;/);
      for (const rule of flatRules(css)) {
        const focused = rule.selectors.some((selector) => selector.includes(":focus-visible") && !/::[\w-]+$/.test(selector));
        if (!focused || !rule.declarations.has("box-shadow")) continue;
        rings++;
        expect(rule.declarations.get("outline"), `${file} ${rule.selectors[0]}`).toBe("var(--neuwo-outline-focus)");
        expect(rule.declarations.get("outline-offset"), `${file} ${rule.selectors[0]}`).toBe("var(--neuwo-outline-focus-offset)");
      }
    }
    expect(rings).toBe(8);
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
    expect(forced(file, ".neuwo-range::-moz-range-track")).toEqual({ background: "GrayText" });
    expect(forced(file, ".neuwo-range::-moz-range-progress")).toEqual({ background: "Highlight" });
  });

  it("marks the combobox's selected option as a selected item and its active option, which wins, as a highlight, without the text backplate", () => {
    const file = "src/components/fields/combobox/combobox.css";
    const rules = forcedRules(file);
    const selected = rules.findIndex((rule) => rule.selectors.includes('.neuwo-combobox__option[aria-selected="true"]'));
    const active = rules.findIndex((rule) => rule.selectors.includes(".neuwo-combobox__option.neuwo-combobox__option--active"));
    expect(Object.fromEntries(rules[selected].declarations)).toEqual({ "forced-color-adjust": "none", background: "SelectedItem", color: "SelectedItemText" });
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
