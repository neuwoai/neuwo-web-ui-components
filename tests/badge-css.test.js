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
    expect(css).toContain(".neuwo-badge");
    expect(css).toContain("var(--neuwo-font-heading)");
    // The label renders as authored: the recipe must not force casing.
    expect(css).not.toContain("text-transform: uppercase");
    expect(css).toContain("var(--neuwo-radius-full)");
    expect(css).toContain("var(--neuwo-tint-blue-8)");
    expect(css).toContain("var(--neuwo-tint-blue-20)");
  });

  it("defines the green variant from tokens", () => {
    expect(css).toContain(".neuwo-badge--green");
    expect(css).toContain("var(--neuwo-tint-green-8)");
    expect(css).toContain("var(--neuwo-tint-green-20)");
  });

  it("defines the border, pulse and shimmer motions with reduced-motion handling", () => {
    expect(css).toContain(".neuwo-badge--borderless");
    expect(css).toContain("border-color: transparent");
    expect(css).toContain(".neuwo-badge--pulse");
    expect(css).toContain("@keyframes neuwo-badge-pulse");
    expect(css).toContain(".neuwo-badge--shimmer");
    expect(css).toContain("@keyframes neuwo-badge-shimmer");
    expect(css).toContain("var(--neuwo-color-shimmer)");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });

  it("defines the size axis as font-size-only presets from tokens", () => {
    expect(css).toContain(".neuwo-badge--s");
    expect(css).toContain("var(--neuwo-font-size-2xs)");
    expect(css).toContain(".neuwo-badge--l");
    expect(css).toContain("var(--neuwo-font-size-sm)");
    // Size is font-size only: the size presets must not touch padding.
    expect(css).not.toMatch(/\.neuwo-badge--[sl][^}]*padding/);
  });

  it("scales both motions from the intensity axis without a second keyframe block", () => {
    expect(css).toContain(".neuwo-badge--intensity-s");
    expect(css).toContain(".neuwo-badge--intensity-l");
    // The keyframes read the axis, so one block covers all three steps.
    expect(css).toContain("var(--neuwo-badge-pulse-spread)");
    expect(css).toContain("var(--neuwo-badge-pulse-alpha)");
    expect(css).toContain("var(--neuwo-badge-shimmer-width)");
    expect(css).toContain("var(--neuwo-badge-shimmer-strength)");
    expect(css.match(/@keyframes neuwo-badge-pulse/g)).toHaveLength(1);
    expect(css.match(/@keyframes neuwo-badge-shimmer/g)).toHaveLength(1);
    // Intensity is amplitude only: it must not redefine the motions themselves.
    expect(css).not.toMatch(/\.neuwo-badge--intensity-[sl][^}]*animation/);
  });

  it("sweeps the shimmer with transform, measured in sweep widths, and moves no layout property", () => {
    const [, shimmer] = css.match(/@keyframes neuwo-badge-shimmer\s*{([\s\S]*?)\n}/);
    expect(shimmer).toMatch(/transform:\s*translateX\(/);
    expect(shimmer).toContain("var(--neuwo-badge-shimmer-width)");
    for (const [, frames] of css.matchAll(/@keyframes [\w-]+\s*{([\s\S]*?)\n}/g)) {
      expect(frames).not.toMatch(/(?<![\w-])(left|right|top|width|margin(-[a-z]+)?)\s*:/);
    }
  });

  it("defines the glow treatment from currentColor (no raw hex)", () => {
    expect(css).toContain(".neuwo-badge--glow");
    expect(css).toContain("color-mix(in srgb, currentColor");
  });

  it("uses no raw colour literals", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("styles the outer box from the element name and uses no :host", () => {
    expect(css).not.toContain(":host");
    expect(css).toMatch(/^neuwo-badge\s*{[^}]*display: inline-block/m);
    expect(css).not.toMatch(/(^|[\s,}])\.(badge|deal-id|status-dot)(?![\w-])/);
  });
});
