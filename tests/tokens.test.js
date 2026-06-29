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
});

describe("font-size tokens", () => {
  it("defines --font-size-2xs at 0.625rem for the compact badge size", () => {
    expect(tokensCss).toContain("--font-size-2xs: 0.625rem");
  });
});

describe("font-weight tokens", () => {
  it("defines --font-weight-medium at 500", () => {
    expect(tokensCss).toContain("--font-weight-medium: 500");
  });
  it("defines --font-weight-semibold at 600", () => {
    expect(tokensCss).toContain("--font-weight-semibold: 600");
  });
});
