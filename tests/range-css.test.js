import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(
  join(__dirname, "../src/components/fields/range/range.css"),
  "utf8"
);

describe("range.css recipe", () => {
  it("styles the track and thumb from tokens on the portable class", () => {
    expect(css).toContain(".neuwo-range");
    expect(css).toContain("var(--neuwo-glass-bg)");
    expect(css).toContain("var(--neuwo-color-blue)");
    expect(css).toContain("var(--neuwo-color-white)");
    expect(css).toContain("var(--neuwo-tint-blue-15)");
    expect(css).toContain("var(--neuwo-radius-full)");
    expect(css).toContain("var(--neuwo-opacity-disabled)");
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("drives the geometry from component-scoped custom properties", () => {
    for (const prop of ["--neuwo-range-track-height", "--neuwo-range-thumb-size", "--neuwo-range-thumb-border", "--neuwo-range-thumb-ring"])
      expect(css).toContain(prop);
    // The thumb is centred from the same two values, so the pair cannot drift.
    expect(css).toContain("calc((var(--neuwo-range-track-height) - var(--neuwo-range-thumb-size)) / 2)");
  });

  it("fills the track in both engines", () => {
    // WebKit has no progress pseudo-element: the component-written --neuwo-range-fill
    // sizes a gradient over a neutral base, so the unfilled side is never blue.
    expect(css).toContain("::-webkit-slider-runnable-track");
    expect(css).toContain("background-size: var(--neuwo-range-fill, 0%) 100%");
    expect(css).toContain("::-moz-range-progress");
  });

  it("rings the thumb on focus instead of the input box", () => {
    expect(css).toContain("var(--neuwo-shadow-focus)");
    expect(css).toMatch(/\.neuwo-range:focus-visible::-webkit-slider-thumb/);
    expect(css).toMatch(/\.neuwo-range:focus-visible::-moz-range-thumb/);
    // The shared field chrome rings the whole box; that has to come back off.
    expect(css).toMatch(/\.neuwo-range:focus-visible\s*\{[^}]*box-shadow:\s*none/);
  });

  it("resets the shared field chrome so the input box paints nothing", () => {
    expect(css).toMatch(/\.neuwo-range\s*\{[^}]*background:\s*transparent/);
    expect(css).toMatch(/\.neuwo-range\s*\{[^}]*border:\s*0/);
  });

  it("insets the track horizontally so the error ring clears the thumb halo", () => {
    // Unconditional, not tied to the error state: this padding sizes the track,
    // so applying it only on error would resize the slider as the error appears.
    expect(css).toMatch(/\.neuwo-range\s*\{[^}]*padding:\s*0 var\(--neuwo-space-2\)/);
  });

  it("stills the thumb under reduced motion", () => {
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*transform:\s*none/);
  });

  it("selects only on its prefixed class, never the bare one", () => {
    expect(css).not.toMatch(/(^|[\s,}])\.range\b/);
  });

  it("is in the reset's tag and block lists", () => {
    const reset = readFileSync(join(__dirname, "../src/components/reset.css"), "utf8");
    expect(reset).toContain("neuwo-range,");
    expect(reset).toContain('.neuwo-range, [class*="neuwo-range__"], [class*="neuwo-range--"]');
  });

  it("keeps every visual value on the portable class, not on :host", () => {
    expect(css).not.toContain(":host");
  });
});
