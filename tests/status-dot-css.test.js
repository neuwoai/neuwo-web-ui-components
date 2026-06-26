import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(
  join(__dirname, "../src/components/status-dot/status-dot.css"),
  "utf8"
);

describe("status-dot.css recipe", () => {
  it("renders a colour-aware dot and ring from tokens", () => {
    expect(css).toContain(".status-dot");
    expect(css).toContain("border-radius: 50%");
    expect(css).toContain("var(--color-green)");
    expect(css).toContain(".status-dot--blue");
    expect(css).toContain("var(--color-blue)");
    expect(css).toContain("currentColor");
  });

  it("inlines both keyframes and gates them on reduced motion", () => {
    expect(css).toContain("@keyframes status-dot-pulse");
    expect(css).toContain("@keyframes status-dot-blink");
    expect(css).toContain(".status-dot--pulse");
    expect(css).toContain(".status-dot--blink");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });

  it("uses no raw colour literals", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("defines the halo-intensity presets from currentColor (no raw hex)", () => {
    expect(css).toContain(".status-dot--halo-s");
    expect(css).toContain(".status-dot--halo-l");
    expect(css).toContain("color-mix(in srgb, currentColor");
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
