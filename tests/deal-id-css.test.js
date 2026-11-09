import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(
  join(__dirname, "../src/components/deal-id/deal-id.css"),
  "utf8"
);

describe("deal-id.css recipe", () => {
  it("renders a rounded value box from tokens", () => {
    expect(css).toContain(".deal-id");
    expect(css).toContain("var(--neuwo-font-size-sm)");
    expect(css).toContain("var(--neuwo-color-heading)");
    expect(css).toContain("var(--neuwo-tint-green-5)");
    expect(css).toContain("var(--neuwo-tint-green-15)");
    expect(css).toContain("var(--neuwo-radius-md)");
  });

  it("defines the size axis as font-size-only presets from tokens", () => {
    expect(css).toContain(".deal-id--s");
    expect(css).toContain("var(--neuwo-font-size-xs)");
    expect(css).toContain(".deal-id--l");
    expect(css).toContain("var(--neuwo-font-size-base)");
    expect(css).not.toMatch(/\.deal-id--[sl][^}]*padding/);
  });

  it("uses no raw colour literals", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
