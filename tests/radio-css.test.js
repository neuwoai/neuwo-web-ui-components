// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { LIGHT_COMPONENT_CSS } from "../scripts/light-css.js";
import { expand } from "../src/server/index.js";
import { splitTopLevel, weight } from "./fixtures/specificity.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(__dirname, path), "utf8");
const css = read("../src/components/selection/radio/radio-group.css");
const reset = read("../src/components/reset.css");
const recipes = ["../src/components/selection/form-check.css", "../src/components/selection/toggle/toggle.css", "../src/components/selection/radio/radio-group.css"]
  .map((path) => read(path).replace(/\/\*[\s\S]*?\*\//g, "").replace(/@media[^{]*\{[\s\S]*?\}\s*\}/g, ""))
  .join("\n");
const accents = Array.from(recipes.matchAll(/([^{}]+)\{([^{}]*)\}/g))
  .filter(([, , body]) => body.includes("border-color: var(--neuwo-color-red)"))
  .flatMap(([, selectors]) => splitTopLevel(selectors.trim()));
const accentedBy = (el) => accents.filter((selector) => el.matches(selector));

const radio = (id) => `<neuwo-radio id="${id}" value="${id}">${id}</neuwo-radio>`;

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

  it("leaves the radios' accent to their own label's error modifier, never the legend, with no hex colour literals", () => {
    expect(css).not.toContain(".neuwo-form-check__input");
    expect(css).not.toContain("--neuwo-color-red");
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("accents only the group's own radios, at two classes of weight, so a nested checkbox, toggle or group keeps its own colour", () => {
    document.body.innerHTML = expand(
      `<neuwo-radio-group name="g" error="Pick one">${radio("own")}<div>${radio("deep")}</div>` +
        `<neuwo-checkbox id="checkbox" name="c">C</neuwo-checkbox><neuwo-toggle id="toggle" name="t">T</neuwo-toggle>` +
        `<neuwo-radio-group name="n">${radio("nested")}</neuwo-radio-group>` +
        `<neuwo-radio-group name="m" error="Also">${radio("both")}</neuwo-radio-group></neuwo-radio-group>` +
        `<neuwo-radio-group name="o"><neuwo-radio-group name="p" error="Inner">${radio("inner")}</neuwo-radio-group>${radio("outer")}</neuwo-radio-group>` +
        `<neuwo-radio-group name="q" error="Muted" error-muted>${radio("muted")}</neuwo-radio-group>`,
    );
    const input = (id) => document.querySelector(`#${id} .neuwo-form-check__input, #${id} .neuwo-form-toggle__input`);
    for (const id of ["own", "deep", "both", "inner"]) {
      const by = accentedBy(input(id));
      expect(by, id).toHaveLength(1);
      expect(weight(by[0]), id).toEqual([0, 2, 0]);
    }
    for (const id of ["checkbox", "toggle", "nested", "outer", "muted"]) expect(accentedBy(input(id)), id).toEqual([]);
    expect(accentedBy(document.querySelector("#toggle .neuwo-form-toggle__track"))).toEqual([]);
    document.body.innerHTML = "";
  });

  it("accents each radio by its nearest group alone, at any depth", () => {
    const group = (name, error, inner) => `<neuwo-radio-group name="${name}"${error ? ' error="x"' : ""}>${inner}</neuwo-radio-group>`;
    document.body.innerHTML = expand(group("a", 1, radio("a1") + group("b", 0, radio("b1") + group("c", 1, radio("c1") + group("d", 0, radio("d1") + group("e", 1, radio("e1")))))));
    const accented = Object.fromEntries(["a1", "b1", "c1", "d1", "e1"].map((id) => [id, accentedBy(document.querySelector(`#${id} .neuwo-form-check__input`)).length === 1]));
    expect(accented).toEqual({ a1: true, b1: false, c1: true, d1: false, e1: true });
    document.body.innerHTML = "";
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
