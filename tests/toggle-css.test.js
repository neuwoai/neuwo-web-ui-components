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
    expect(css).toContain("var(--neuwo-glass-bg-light)");
    expect(css).toContain("var(--neuwo-color-heading)");
    expect(css).toContain(".form-toggle__input:checked + .form-toggle__track");
    expect(css).toContain("var(--neuwo-color-blue)");
  });

  it("rings an unchecked switch when the pulse axis is on", () => {
    // Only while off: the ring is an invitation to flip it, so switching it on
    // ends the animation through the selector rather than through JS.
    expect(css).toMatch(/\.form-toggle--pulse \.form-toggle__input:not\(:checked\) \+ \.form-toggle__track::before/);
    expect(css).toContain("@keyframes toggle-pulse");
    // The ring reads in the brand accent, like the CTA's, not in the track's
    // own muted colour, which would barely register against the glass.
    expect(css).toMatch(/@keyframes toggle-pulse[\s\S]*var\(--neuwo-color-blue\)/);
    expect(css).toContain("var(--neuwo-toggle-pulse-spread, 12px)");
    expect(css).toContain("var(--neuwo-toggle-pulse-alpha, 40%)");
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.form-toggle--pulse[\s\S]*animation: none/);
  });

  it("uses tokens for focus/disabled/error and guards reduced motion", () => {
    expect(css).toContain("var(--neuwo-shadow-focus)");
    expect(css).toContain("var(--neuwo-opacity-disabled)");
    expect(css).toContain(".form-toggle--error");
    expect(css).toContain("var(--neuwo-shadow-danger)");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
