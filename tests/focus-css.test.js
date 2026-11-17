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
  ["src/foundation/markdown.css", ".neuwo-markdown pre:focus-visible"],
];

const BORDERLESS = [
  ["src/components/selection/segmented/segmented.css", ".neuwo-segmented__option:focus-visible"],
];

const RINGED = [
  ["src/components/button/button.css", ".neuwo-btn:focus-visible", "calc(-1px - var(--neuwo-shadow-focus-ring-offset))"],
  ["src/components/copy/copy.css", ".neuwo-copy__button:focus-visible", "calc(-1px - var(--neuwo-shadow-focus-ring-offset))"],
  ["src/components/notice/notice.css", ".neuwo-notice__dismiss:focus-visible", "calc(-1 * var(--neuwo-shadow-focus-ring-offset))"],
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

  it("rings a focused button 1px clear of its edge: a solid blue line, a short blur, then the 20% band", () => {
    const tokens = read("src/foundation/tokens.css");
    expect(tokens).toContain(
      "--neuwo-shadow-focus-ring: 0 0 0 1px var(--neuwo-color-blue), 0 0 2px 1px color-mix(in srgb, var(--neuwo-color-blue) 60%, transparent), 0 0 0 4px var(--neuwo-tint-blue-20);",
    );
    expect(tokens).toContain("--neuwo-shadow-focus-ring-offset: 1px;");
  });

  it.each(RINGED)("draws the ring on its own box, leaving the border alone, in %s", (file, selector, inset) => {
    const css = read(file);
    const body = ruleFor(css, selector);
    expect(body).toMatch(/outline:\s*var\(--neuwo-outline-focus\);/);
    expect(body).toMatch(/outline-offset:\s*var\(--neuwo-outline-focus-offset\);/);
    expect(body).not.toMatch(/border-color|box-shadow/);
    const ring = ruleFor(css, `${selector}::after`);
    expect(ring).toContain('content: "";');
    expect(ring).toContain("position: absolute;");
    expect(ring).toContain(`inset: ${inset};`);
    expect(ring).toContain("border-radius: inherit;");
    expect(ring).toContain("box-shadow: var(--neuwo-shadow-focus-ring);");
    expect(ring).toContain("pointer-events: none;");
  });

  it("lets focus win over the error state on a field", () => {
    const css = read("src/components/fields/field.css");
    expect(css.match(/^\.neuwo-input--error,\n[^{]*\{([^}]*)\}/m)?.[1]).toMatch(/border-color:\s*var\(--neuwo-color-red\);/);
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
