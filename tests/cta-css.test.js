import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(
  join(__dirname, "../src/components/cta/cta.css"),
  "utf8"
);

describe("cta.css recipe", () => {
  it("styles both variants from tokens on the branded surface", () => {
    expect(css).toContain(".cta--banner");
    expect(css).toContain(".cta--spotlight");
    expect(css).toContain("var(--color-surface-solid)");
    expect(css).toContain("var(--radius-lg)");
    expect(css).toContain("var(--radius-2xl)");
  });

  it("paints the headline accent with the brand gradient", () => {
    expect(css).toContain("::slotted([data-accent])");
    expect(css).toContain("var(--gradient-accent)");
    expect(css).toContain("background-clip: text");
  });

  it("inlines the shimmer and the conic-border spin, reduced-motion-gated", () => {
    expect(css).toContain("@keyframes cta-scan");
    expect(css).toContain("@keyframes cta-spin");
    expect(css).toContain("@property --cta-angle");
    expect(css).toContain("conic-gradient");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });

  it("adds the synchronised button-pulse ring, reduced-motion-gated", () => {
    expect(css).toContain(":host([pulse]) ::slotted(neuwo-button");
    expect(css).toContain("@keyframes cta-button-pulse");
  });

  it("uses no raw colour literals", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/rgba?\(/);
  });
});
