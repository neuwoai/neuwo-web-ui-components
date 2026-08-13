import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(
  join(__dirname, "../src/components/fields/combobox/combobox.css"),
  "utf8"
);

describe("combobox.css recipe", () => {
  it("styles the popup and options from tokens", () => {
    expect(css).toContain(".combobox__popup");
    expect(css).toContain("var(--color-surface-solid)");
    expect(css).toContain("var(--shadow-xl)");
    expect(css).toContain(".combobox__option");
    expect(css).toContain("var(--tint-blue-10)"); // hover
    expect(css).toContain("var(--tint-blue-15)"); // keyboard-active
  });

  it("paints the chevron colour from a token and guards reduced motion", () => {
    expect(css).toContain("background-color: var(--color-text-muted)");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });

  it("reserves a line on the value label so an empty trigger does not collapse", () => {
    expect(css).toContain(".combobox__value");
    expect(css).toContain("min-height: 1lh");
  });

  it("marks the selected option with blue text and no check-mark gutter", () => {
    expect(css).toMatch(
      /\.combobox__option\[aria-selected="true"\]\s*\{[^}]*color:\s*var\(--color-blue\)/
    );
    expect(css).not.toContain(".combobox__option::before");
  });

  it("tightens the chevron gutter at the compact size", () => {
    expect(css).toMatch(/\.field--sm \.combobox__trigger\s*\{[^}]*padding-right:\s*var\(--space-8\)/);
    expect(css).toMatch(/\.field--sm \.combobox__chevron\s*\{[^}]*right:\s*var\(--space-3\)/);
  });
});
