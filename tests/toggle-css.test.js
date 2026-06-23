import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(
  join(__dirname, "../src/components/selection/toggle/toggle.css"),
  "utf8"
);

describe("toggle.css recipe", () => {
  it("builds the track and thumb from tokens and fills the checked track solid blue", () => {
    expect(css).toContain(".form-toggle__track");
    expect(css).toContain(".form-toggle__track::after");
    expect(css).toContain("var(--glass-bg-light)");
    expect(css).toContain("var(--color-heading)");
    expect(css).toContain(".form-toggle__input:checked + .form-toggle__track");
    expect(css).toContain("var(--color-blue)");
  });

  it("uses tokens for focus/disabled/error and guards reduced motion", () => {
    expect(css).toContain("var(--shadow-focus)");
    expect(css).toContain("var(--opacity-disabled)");
    expect(css).toContain(".form-toggle--error");
    expect(css).toContain("var(--shadow-danger)");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
