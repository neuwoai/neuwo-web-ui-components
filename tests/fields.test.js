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

  it("draws the required marker in the label's colour, so it never reads as an error", () => {
    expect(code).toMatch(/\.neuwo-field__required\s*\{\s*margin-inline-start:\s*var\(--neuwo-space-1\);\s*\}/);
  });

  it("sets a mono control in the monospace token, value and placeholder alike", () => {
    expect(code).toMatch(/\.neuwo-input--mono\s*\{\s*font-family:\s*var\(--neuwo-font-mono\);/);
    expect(code.indexOf(".neuwo-input--mono")).toBeGreaterThan(code.indexOf(".neuwo-input {"));
  });

  it("sets mono text a step smaller than a prose field of the same size, keeping the padding", () => {
    const mono = code.match(/^\.neuwo-input--mono \{([^}]*)\}/m)?.[1] ?? "";
    expect(mono).toContain("font-size: var(--neuwo-font-size-sm);");
    expect(code.match(/^\.neuwo-input--sm \{([^}]*)\}/m)?.[1]).toContain("font-size: var(--neuwo-font-size-sm);");
    expect(code.match(/^\.neuwo-input--sm\.neuwo-input--mono \{([^}]*)\}/m)?.[1]).toMatch(/^\s*font-size: var\(--neuwo-font-size-xs\);\s*$/);
    expect(code.indexOf(".neuwo-input--mono {")).toBeGreaterThan(code.indexOf(".neuwo-input--sm {"));
    expect(code).not.toMatch(/\.neuwo-input--mono[^{]*\{[^}]*padding/);
  });

  it("takes an empty label out of the flow so the column gap ignores it", () => {
    expect(code).toMatch(/\.neuwo-field__label--empty\s*\{\s*display:\s*none/);
  });

  it("carries a tokenised error state with a reduced-motion guard", () => {
    expect(code).toMatch(/\.neuwo-input--error,[^{]*\{[^}]*border-color:\s*var\(--neuwo-color-red\)/);
    expect(code).toMatch(/\.neuwo-input--error,[^{]*\{[^}]*box-shadow:\s*var\(--neuwo-shadow-danger\)/);
    expect(code).toMatch(/\.neuwo-input--error,[^{]*\{[^}]*animation:\s*neuwo-field-shake/);
    expect(code).toContain("@keyframes neuwo-field-shake");
    expect(code).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.neuwo-input--error,[^{]*\{\s*animation:\s*none;/);
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
