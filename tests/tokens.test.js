import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tokensCss = readFileSync(join(__dirname, "../src/foundation/tokens.css"), "utf8");

describe("error tokens", () => {
  it("defines a red tint and a danger focus ring built from --neuwo-color-red", () => {
    expect(tokensCss).toContain("--neuwo-tint-red-20:");
    expect(tokensCss).toContain("color-mix(in srgb, var(--neuwo-color-red) 20%, transparent)");
    expect(tokensCss).toContain("--neuwo-shadow-danger:");
    expect(tokensCss).toContain("--neuwo-shadow-danger: 0 0 0 3px var(--neuwo-tint-red-20)");
  });
});

describe("control tokens", () => {
  it("defines a single disabled-opacity token used across controls", () => {
    expect(tokensCss).toContain("--neuwo-opacity-disabled: 0.4");
  });
});

describe("font-size tokens", () => {
  it("defines --neuwo-font-size-2xs at 0.625rem for the compact badge size", () => {
    expect(tokensCss).toContain("--neuwo-font-size-2xs: 0.625rem");
  });
});

describe("font-family tokens", () => {
  it("defines --neuwo-font-mono as a system stack, not a brand face", () => {
    expect(tokensCss).toContain(
      "--neuwo-font-mono: ui-monospace, 'SF Mono', 'JetBrains Mono', Consolas, monospace"
    );
  });
});

describe("font-weight tokens", () => {
  it("defines --neuwo-font-weight-medium at 500", () => {
    expect(tokensCss).toContain("--neuwo-font-weight-medium: 500");
  });
  it("defines --neuwo-font-weight-semibold at 600", () => {
    expect(tokensCss).toContain("--neuwo-font-weight-semibold: 600");
  });
});
