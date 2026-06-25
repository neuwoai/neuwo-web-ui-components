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
    expect(css).toContain("text-transform: uppercase");
    expect(css).toContain("var(--radius-full)");
    expect(css).toContain("var(--tint-blue-8)");
    expect(css).toContain("var(--tint-blue-20)");
  });

  it("defines the green variant from tokens", () => {
    expect(css).toContain(".badge--green");
    expect(css).toContain("var(--tint-green-8)");
    expect(css).toContain("var(--tint-green-20)");
  });

  it("defines the border and pulse axes with reduced-motion handling", () => {
    expect(css).toContain(".badge--borderless");
    expect(css).toContain("border-color: transparent");
    expect(css).toContain(".badge--pulse");
    expect(css).toContain("@keyframes badge-pulse");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });

  it("uses no raw colour literals", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
