import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(__dirname, path), "utf8");
const css = read("../src/components/selection/form-check.css");
const controls = read("../src/components/selection/controls.css");
const reset = read("../src/components/reset.css");

describe("form-check.css recipe", () => {
  it("styles the box and indicators from tokens", () => {
    expect(css).toContain(".neuwo-form-check__input");
    expect(css).toContain("var(--neuwo-color-blue)");
    expect(css).toContain("var(--neuwo-shadow-focus)");
    expect(css).toContain('.neuwo-form-check__input[type="radio"]');
    expect(css).toContain('.neuwo-form-check__input[type="checkbox"]:checked');
    expect(css).toContain('.neuwo-form-check__input[type="checkbox"]:indeterminate');
    expect(css).toContain('.neuwo-form-check__input[type="radio"]:checked');
  });

  it("uses the disabled token and a red error accent, with no hex colour literals", () => {
    expect(css).toContain("var(--neuwo-opacity-disabled)");
    expect(css).toContain(".neuwo-form-check--error .neuwo-form-check__input");
    expect(css).toContain("var(--neuwo-color-red)");
    expect(css).toContain("var(--neuwo-shadow-danger)");
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("lays the element out as an inline box unless it is hidden", () => {
    expect(css).toMatch(/neuwo-checkbox:not\(\[hidden\]\)\s*\{\s*display: inline-flex;\s*\}/);
  });

  it("stills the box's transition under reduced motion", () => {
    expect(css).toMatch(/\.neuwo-form-check__input\s*\{[^}]*transition:/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.neuwo-form-check__input\s*\{\s*transition: none;/);
  });

  it("is in the reset's tag and block lists", () => {
    expect(reset).toContain("neuwo-checkbox,");
    expect(reset).toContain('[class^="neuwo-choice"], [class*=" neuwo-choice"]');
    expect(reset).toContain('[class^="neuwo-form-check"], [class*=" neuwo-form-check"]');
  });
});

describe("controls.css, the selection shell", () => {
  it("stacks the control's block over the error line", () => {
    expect(controls).toMatch(/\.neuwo-choice\s*\{[^}]*display: flex;[^}]*flex-direction: column;[^}]*gap: var\(--neuwo-space-1\);[^}]*align-items: flex-start;/);
  });

  it("reserves one line for the error message in red", () => {
    expect(controls).toMatch(/\.neuwo-choice__error\s*\{[^}]*display: block;[^}]*min-height: 1lh;[^}]*var\(--neuwo-font-size-sm\)[^}]*var\(--neuwo-color-red\)/);
    expect(controls).not.toContain(".control-error");
    expect(controls).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
