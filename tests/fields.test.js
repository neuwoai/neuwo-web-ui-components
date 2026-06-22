import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fieldCss = readFileSync(
  join(__dirname, "../src/components/fields/field.css"),
  "utf8"
);

describe("field.css recipe", () => {
  it("styles the control from tokens with a focus ring", () => {
    expect(fieldCss).toContain(".input");
    expect(fieldCss).toContain("var(--glass-bg)");
    expect(fieldCss).toContain("var(--radius-lg)");
    expect(fieldCss).toContain(".input:focus-visible");
    expect(fieldCss).toContain("var(--shadow-focus)");
    expect(fieldCss).toContain("var(--color-grey-400)");
  });

  it("carries a tokenised error state with a reduced-motion guard", () => {
    expect(fieldCss).toContain(".input--error");
    expect(fieldCss).toContain("var(--color-red)");
    expect(fieldCss).toContain("var(--shadow-danger)");
    expect(fieldCss).toContain("@keyframes neuwo-field-shake");
    expect(fieldCss).toContain("prefers-reduced-motion: reduce");
  });
});
