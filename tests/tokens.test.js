import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tokensCss = readFileSync(join(__dirname, "../src/foundation/tokens.css"), "utf8");

describe("error tokens", () => {
  it("defines a red tint and a danger focus ring built from --color-red", () => {
    expect(tokensCss).toContain("--tint-red-20:");
    expect(tokensCss).toContain("color-mix(in srgb, var(--color-red) 20%, transparent)");
    expect(tokensCss).toContain("--shadow-danger:");
    expect(tokensCss).toContain("--shadow-danger: 0 0 0 3px var(--tint-red-20)");
  });
});

describe("control tokens", () => {
  it("defines a single disabled-opacity token used across controls", () => {
    expect(tokensCss).toContain("--opacity-disabled: 0.4");
  });
  it("defines a 45% blue tint for the checked toggle border", () => {
    expect(tokensCss).toContain("--tint-blue-45:");
    expect(tokensCss).toContain("color-mix(in srgb, var(--color-blue) 45%, transparent)");
  });
});
