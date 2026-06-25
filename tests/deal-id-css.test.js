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
    expect(css).toContain("var(--font-size-sm)");
    expect(css).toContain("var(--color-heading)");
    expect(css).toContain("var(--tint-green-5)");
    expect(css).toContain("var(--tint-green-15)");
    expect(css).toContain("var(--radius-md)");
  });

  it("uses no raw colour literals", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
