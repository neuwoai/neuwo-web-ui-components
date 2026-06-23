import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(
  join(__dirname, "../src/components/selection/form-check.css"),
  "utf8"
);

describe("form-check.css recipe", () => {
  it("styles the box and indicators from tokens", () => {
    expect(css).toContain(".form-check__input");
    expect(css).toContain("var(--color-blue)");
    expect(css).toContain("var(--shadow-focus)");
    expect(css).toContain('.form-check__input[type="radio"]');
    expect(css).toContain('.form-check__input[type="checkbox"]:checked');
    expect(css).toContain('.form-check__input[type="checkbox"]:indeterminate');
    expect(css).toContain('.form-check__input[type="radio"]:checked');
  });

  it("uses the disabled token and a red error accent, with no hex colour literals", () => {
    expect(css).toContain("var(--opacity-disabled)");
    expect(css).toContain(".form-check--error");
    expect(css).toContain("var(--color-red)");
    expect(css).toContain("var(--shadow-danger)");
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
