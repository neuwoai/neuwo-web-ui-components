import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
/** @param {string} file */
const read = (file) => readFileSync(join(root, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * The body of the rule whose whole selector list is `selector`, so a shared `:hover, :focus-visible` rule is skipped.
 * @param {string} css
 * @param {string} selector
 */
function ruleFor(css, selector) {
  const escaped = selector.replace(/[[\]().*+]/g, "\\$&");
  return css.match(new RegExp(`(?<!,\\n)^${escaped} \\{([^}]*)\\}`, "m"))?.[1] ?? "";
}

const BORDERED = [
  ["src/components/fields/field.css", ".neuwo-input:focus-visible"],
  ["src/components/fields/combobox/combobox.css", ".neuwo-combobox__trigger:focus"],
  ["src/components/selection/form-check.css", ".neuwo-form-check__input:focus-visible"],
  ["src/components/selection/toggle/toggle.css", ".neuwo-form-toggle__input:focus-visible + .neuwo-form-toggle__track"],
  ["src/components/button/button.css", ".neuwo-btn:focus-visible"],
  ["src/components/copy/copy.css", ".neuwo-copy__button:focus-visible"],
  ["src/foundation/markdown.css", ".neuwo-markdown pre:focus-visible"],
];

const BORDERLESS = [
  ["src/components/notice/notice.css", ".neuwo-notice__dismiss:focus-visible"],
  ["src/components/selection/segmented/segmented.css", ".neuwo-segmented__option:focus-visible"],
];

describe("focus recipe", () => {
  it("draws focus and error with one shape: a 3px band at 20% of the state's colour", () => {
    const tokens = read("src/foundation/tokens.css");
    expect(tokens).toContain("--neuwo-shadow-focus: 0 0 0 3px var(--neuwo-tint-blue-20);");
    expect(tokens).toContain("--neuwo-shadow-danger: 0 0 0 3px var(--neuwo-tint-red-20);");
  });

  it.each(BORDERED)("turns the border blue and draws the band in %s", (file, selector) => {
    const body = ruleFor(read(file), selector);
    expect(body).toMatch(/border-color:\s*var\(--neuwo-color-blue\);/);
    expect(body).toMatch(/box-shadow:\s*var\(--neuwo-shadow-focus\);/);
    expect(body).toMatch(/outline:\s*var\(--neuwo-outline-focus\);/);
  });

  it.each(BORDERLESS)("draws the band on a borderless control in %s", (file, selector) => {
    expect(ruleFor(read(file), selector)).toMatch(/box-shadow:\s*var\(--neuwo-shadow-focus\);/);
  });

  it("lets focus win over the error state on a field", () => {
    const css = read("src/components/fields/field.css");
    expect(ruleFor(css, ".neuwo-input--error")).toMatch(/border-color:\s*var\(--neuwo-color-red\);/);
    expect(ruleFor(css, ".neuwo-input:focus-visible")).toMatch(/border-color:\s*var\(--neuwo-color-blue\);/);
  });

  it("lets focus win over the error state on a checkbox and a radio, whose rules weigh the same", () => {
    const css = read("src/components/selection/form-check.css");
    const error = css.search(/^\.neuwo-form-check--error > \.neuwo-form-check__input \{/m);
    const focus = css.search(/^\.neuwo-form-check__input:focus-visible \{/m);
    expect(error).toBeGreaterThan(-1);
    expect(focus).toBeGreaterThan(error);
  });
});
