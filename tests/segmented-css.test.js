import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(
  join(__dirname, "../src/components/selection/segmented/segmented.css"),
  "utf8"
);

describe("segmented.css recipe", () => {
  it("styles the pill and options from tokens", () => {
    expect(css).toContain(".segmented");
    expect(css).toContain(".segmented__option");
    expect(css).toContain("var(--glass-bg-light)");
    expect(css).toContain("var(--color-text-muted)");
  });
  it("drives the active state from aria-checked and uses tokens for state", () => {
    expect(css).toContain('.segmented__option[aria-checked="true"]');
    expect(css).toContain("var(--color-blue)");
    expect(css).toContain("var(--color-white)");
    expect(css).toContain("var(--shadow-focus)");
    expect(css).toContain("var(--opacity-disabled)");
    expect(css).toContain(".segmented--error");
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("renders a sliding indicator that animates and respects reduced motion", () => {
    expect(css).toContain(".segmented__indicator");
    expect(css).toContain("var(--color-blue)");
    expect(css).toContain("transform var(--transition-base)");
    expect(css).toContain(".segmented__indicator--animated");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });
});
