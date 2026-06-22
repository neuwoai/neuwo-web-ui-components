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
