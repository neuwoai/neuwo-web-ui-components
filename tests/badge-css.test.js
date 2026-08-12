import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(
  join(__dirname, "../src/components/badge/badge.css"),
  "utf8"
);

describe("badge.css recipe", () => {
  it("inlines eyebrow typography and the pill from tokens", () => {
    expect(css).toContain(".badge");
    expect(css).toContain("var(--font-heading)");
    // The label renders as authored: the recipe must not force casing.
    expect(css).not.toContain("text-transform: uppercase");
    expect(css).toContain("var(--radius-full)");
    expect(css).toContain("var(--tint-blue-8)");
    expect(css).toContain("var(--tint-blue-20)");
  });

  it("defines the green variant from tokens", () => {
    expect(css).toContain(".badge--green");
    expect(css).toContain("var(--tint-green-8)");
    expect(css).toContain("var(--tint-green-20)");
  });

  it("defines the border, pulse and shimmer motions with reduced-motion handling", () => {
    expect(css).toContain(".badge--borderless");
    expect(css).toContain("border-color: transparent");
    expect(css).toContain(".badge--pulse");
    expect(css).toContain("@keyframes badge-pulse");
    expect(css).toContain(".badge--shimmer");
    expect(css).toContain("@keyframes badge-shimmer");
    expect(css).toContain("var(--color-shimmer)");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });

  it("defines the size axis as font-size-only presets from tokens", () => {
    expect(css).toContain(".badge--s");
    expect(css).toContain("var(--font-size-2xs)");
    expect(css).toContain(".badge--l");
    expect(css).toContain("var(--font-size-sm)");
    // Size is font-size only: the size presets must not touch padding.
    expect(css).not.toMatch(/\.badge--[sl][^}]*padding/);
  });

  it("scales both motions from the intensity axis without a second keyframe block", () => {
    expect(css).toContain(".badge--intensity-s");
    expect(css).toContain(".badge--intensity-l");
    // The keyframes read the axis, so one block covers all three steps.
    expect(css).toContain("var(--badge-pulse-spread)");
    expect(css).toContain("var(--badge-pulse-alpha)");
    expect(css).toContain("var(--badge-shimmer-width)");
    expect(css).toContain("var(--badge-shimmer-strength)");
    expect(css.match(/@keyframes badge-pulse/g)).toHaveLength(1);
    expect(css.match(/@keyframes badge-shimmer/g)).toHaveLength(1);
    // Intensity is amplitude only: it must not redefine the motions themselves.
    expect(css).not.toMatch(/\.badge--intensity-[sl][^}]*animation/);
  });

  it("defines the glow treatment from currentColor (no raw hex)", () => {
    expect(css).toContain(".badge--glow");
    expect(css).toContain("color-mix(in srgb, currentColor");
  });

  it("uses no raw colour literals", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
