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

  it("fills a partly selected checkbox blue, like a checked one", () => {
    expect(css).toMatch(
      /^\.neuwo-form-check__input:checked,\n\.neuwo-form-check__input\[type="checkbox"\]:indeterminate \{\s*background-color: var\(--neuwo-color-blue\);\s*border-color: var\(--neuwo-color-blue\);\s*\}/m,
    );
  });

  it("draws the tick, the dash and the radio dot as masks over the white token, on the input's ::before", () => {
    expect(css.replace(/\/\*[\s\S]*?\*\//g, "").replaceAll("var(--neuwo-color-white)", "")).not.toMatch(/white/i);
    expect(css).not.toContain("background-image");
    const body = (selectors) => css.match(new RegExp(`(?<!,\\n)^${selectors.replace(/[[\]().*]/g, "\\$&")}\\s*\\{([^}]*)\\}`, "m"))?.[1] ?? "";
    for (const state of ['[type="checkbox"]:checked', '[type="checkbox"]:indeterminate', '[type="radio"]:checked']) {
      const mark = body(`.neuwo-form-check__input${state}::before`);
      expect(mark, state).toMatch(/(^|\s)mask: url\("data:image\/svg\+xml,[^"]*"\)/);
      expect(mark, state).toMatch(/-webkit-mask: url\("data:image\/svg\+xml,[^"]*"\)/);
    }
    const shared = body('.neuwo-form-check__input:checked::before,\n.neuwo-form-check__input[type="checkbox"]:indeterminate::before');
    expect(shared).toContain('content: "";');
    expect(shared).toContain("background: var(--neuwo-color-white);");
  });

  it("draws the marks in CanvasText under forced colours, where the forced Canvas background would hide them", () => {
    const forced = css.match(/@media \(forced-colors: active\) \{([\s\S]*?\})\s*\}/)?.[1] ?? "";
    expect(forced).toMatch(/^\s*\.neuwo-form-check__input:checked::before,\s*\.neuwo-form-check__input\[type="checkbox"\]:indeterminate::before\s*\{\s*background: CanvasText;\s*\}$/);
  });

  it("uses the disabled token and a red error accent, with no hex colour literals", () => {
    expect(css).toContain("var(--neuwo-opacity-disabled)");
    expect(css).toContain(".neuwo-form-check--error > .neuwo-form-check__input");
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
    expect(reset).toContain('.neuwo-choice, [class*="neuwo-choice__"], [class*="neuwo-choice--"]');
    expect(reset).toContain('.neuwo-form-check, [class*="neuwo-form-check__"], [class*="neuwo-form-check--"]');
  });
});

describe("controls.css, the selection shell", () => {
  it("stacks the control's block over the error line", () => {
    expect(controls).toMatch(/\.neuwo-choice\s*\{[^}]*display: flex;[^}]*flex-direction: column;[^}]*gap: var\(--neuwo-space-1\);[^}]*align-items: flex-start;/);
  });

  it("has a flush modifier that drops the gap and stretches the block, at one class of weight", () => {
    expect(controls).toMatch(/\.neuwo-choice--flush\s*\{\s*gap: 0;\s*align-items: stretch;\s*\}/);
    expect(controls.indexOf(".neuwo-choice--flush")).toBeGreaterThan(controls.indexOf(".neuwo-choice {"));
  });

  it("reserves one line for the error message in red", () => {
    expect(controls).toMatch(/\.neuwo-choice__error\s*\{[^}]*display: block;[^}]*min-height: 1lh;[^}]*var\(--neuwo-font-size-sm\)[^}]*var\(--neuwo-color-red\)/);
    expect(controls).not.toContain(".control-error");
    expect(controls).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
