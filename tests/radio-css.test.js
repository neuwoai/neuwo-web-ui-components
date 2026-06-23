import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(
  join(__dirname, "../src/components/selection/radio/radio-group.css"),
  "utf8"
);

describe("radio-group.css recipe", () => {
  it("lays out the legend and options from tokens", () => {
    expect(css).toContain(".radio-group__legend");
    expect(css).toContain(".radio-group__options");
    expect(css).toContain("var(--color-heading)");
    expect(css).toContain('[orientation="horizontal"]');
  });
  it("accents the legend red on error, with no hex literals", () => {
    expect(css).toContain(".radio-group--error");
    expect(css).toContain("var(--color-red)");
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
