import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fieldCss = readFileSync(join(__dirname, "../src/components/fields/field.css"), "utf8");
const code = fieldCss.replace(/\/\*[\s\S]*?\*\//g, "");

describe("field.css recipe", () => {
  it("makes every field element a block unless it is hidden", () => {
    expect(code).toMatch(
      /neuwo-input:not\(\[hidden\]\),\s*neuwo-textarea:not\(\[hidden\]\),\s*neuwo-range:not\(\[hidden\]\),\s*neuwo-combobox:not\(\[hidden\]\)\s*\{\s*display:\s*block;\s*\}/,
    );
  });

  it("draws no box for the label content wrapper", () => {
    expect(code).toMatch(/\.neuwo-field__label-content\s*\{\s*display:\s*contents;\s*\}/);
  });

  it("styles the control from tokens with a focus ring", () => {
    expect(code).toContain(".neuwo-input {");
    expect(code).toContain("var(--neuwo-glass-bg)");
    expect(code).toContain("var(--neuwo-radius-lg)");
    expect(code).toContain(".neuwo-input:focus-visible");
    expect(code).toContain("var(--neuwo-shadow-focus)");
    expect(code).toMatch(/\.neuwo-input::placeholder\s*\{\s*color:\s*var\(--neuwo-color-grey-400\)/);
  });

  it("gives a native text control its own line height back from the reset, at one class of weight", () => {
    expect(code).toMatch(/\.neuwo-input:where\(input, textarea\)\s*\{\s*line-height:\s*normal;\s*\}/);
  });

  it("takes an empty label out of the flow so the column gap ignores it", () => {
    expect(code).toMatch(/\.neuwo-field__label--empty\s*\{\s*display:\s*none/);
  });

  it("carries a tokenised error state with a reduced-motion guard", () => {
    expect(code).toMatch(/\.neuwo-input--error\s*\{[^}]*border-color:\s*var\(--neuwo-color-red\)/);
    expect(code).toMatch(/\.neuwo-input--error\s*\{[^}]*box-shadow:\s*var\(--neuwo-shadow-danger\)/);
    expect(code).toMatch(/\.neuwo-input--error\s*\{[^}]*animation:\s*neuwo-field-shake/);
    expect(code).toContain("@keyframes neuwo-field-shake");
    expect(code).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.neuwo-input--error\s*\{\s*animation:\s*none;/);
  });

  it("carries a compact size step for the control, the label and the error line", () => {
    expect(code).toMatch(/\.neuwo-input--sm\s*\{[^}]*padding:\s*var\(--neuwo-space-2\) var\(--neuwo-space-3\)/);
    expect(code).toMatch(/\.neuwo-input--sm\s*\{[^}]*font-size:\s*var\(--neuwo-font-size-sm\)/);
    expect(code).toMatch(/\.neuwo-field--sm\s*\{[^}]*gap:\s*var\(--neuwo-space-1\)/);
    expect(code).toMatch(/\.neuwo-field--sm \.neuwo-field__label,\s*\.neuwo-field--sm \.neuwo-field__error\s*\{\s*font-size:\s*var\(--neuwo-font-size-xs\)/);
  });

  it("leaves no unprefixed class, :host or raw colour behind", () => {
    for (const [, name] of code.matchAll(/\.([a-zA-Z_][\w-]*)/g)) expect(name).toMatch(/^neuwo-(?!neuwo-)/);
    expect(code).not.toMatch(/:host|::part|::slotted/);
    expect(code).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/);
  });
});
