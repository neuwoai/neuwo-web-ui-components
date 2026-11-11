import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { LIGHT_COMPONENT_CSS } from "../scripts/light-css.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(__dirname, path), "utf8");
const css = read("../src/components/selection/radio/radio-group.css");
const reset = read("../src/components/reset.css");

describe("radio-group.css recipe", () => {
  it("lays out the legend and the options from tokens, in a row only under the horizontal modifier", () => {
    expect(css).toMatch(/\.neuwo-radio-group\s*\{[^}]*flex-direction: column;[^}]*gap: var\(--neuwo-space-2\);/);
    expect(css).toMatch(/\.neuwo-radio-group__legend\s*\{[^}]*var\(--neuwo-color-heading\)/);
    expect(css).toMatch(/\.neuwo-radio-group__options\s*\{[^}]*flex-direction: column;[^}]*gap: var\(--neuwo-space-3\);/);
    expect(css).toMatch(
      /\.neuwo-radio-group--horizontal > \.neuwo-radio-group__options\s*\{[^}]*flex-direction: row;[^}]*flex-wrap: wrap;[^}]*gap: var\(--neuwo-space-5\);/,
    );
    expect(css).not.toMatch(/:host|\[orientation/);
  });

  it("leaves the shell's spacing to the shell's own modifier, at one class of weight", () => {
    expect(css).not.toContain(":has(");
    expect(css).not.toMatch(/\.neuwo-choice\b/);
  });

  it("lets a radio's label fill its row, so a click anywhere on the row picks it", () => {
    expect(css).toMatch(/neuwo-radio > \.neuwo-form-check\s*\{\s*flex: 1 1 auto;\s*\}/);
  });

  it("rings the group's radios on an error, never the legend, with no hex colour literals", () => {
    expect(css).toMatch(/\.neuwo-radio-group--error \.neuwo-form-check__input\s*\{[^}]*border-color: var\(--neuwo-color-red\);[^}]*box-shadow: var\(--neuwo-shadow-danger\);/);
    expect(css).not.toMatch(/__legend[^{}]*\{[^}]*--neuwo-color-red/);
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("lays both elements out as boxes unless they are hidden", () => {
    expect(css).toMatch(/neuwo-radio-group:not\(\[hidden\]\)\s*\{\s*display: block;\s*\}/);
    expect(css).toMatch(/neuwo-radio:not\(\[hidden\]\)\s*\{\s*display: inline-flex;\s*\}/);
  });

  it("joins the light stylesheets and the reset's tag and block lists", () => {
    expect(LIGHT_COMPONENT_CSS).toContain("src/components/selection/radio/radio-group.css");
    expect(reset).toContain("neuwo-radio, neuwo-radio-group,");
    expect(reset).toContain('[class^="neuwo-radio-group"], [class*=" neuwo-radio-group"]');
  });
});
