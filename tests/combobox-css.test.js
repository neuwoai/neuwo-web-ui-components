import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(__dirname, path), "utf8");
const css = read("../src/components/fields/combobox/combobox.css");
const rule = (selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[},])\\s*${escaped}\\s*\\{([^}]*)\\}`, "m").exec(css)?.[2] ?? null;
};

describe("combobox.css recipe", () => {
  it("styles the popup and options from tokens", () => {
    const popup = read("../src/components/popup.css");
    for (const selector of [".neuwo-combobox__popup", ".neuwo-combobox__option", ".neuwo-combobox__option--active"]) {
      expect(popup).toContain(`:is(${selector})`);
    }
    expect(css).not.toContain("--neuwo-color-surface-solid");
    expect(css).not.toContain("neuwo-combobox-in");
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("paints the chevron colour from a token and turns it while open", () => {
    expect(rule(".neuwo-combobox__chevron")).toContain("background-color: var(--neuwo-color-text-muted)");
    expect(rule('.neuwo-combobox__trigger[aria-expanded="true"] ~ .neuwo-combobox__chevron')).toContain("rotate(180deg)");
  });

  it("stills the chevron's turn under reduced motion", () => {
    expect(rule(".neuwo-combobox__chevron")).toContain("transition: transform");
    const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).toMatch(/\.neuwo-combobox__chevron\s*\{\s*transition:\s*none;?\s*\}/);
  });

  it("draws no banner or divider comments", () => {
    expect(css).not.toMatch(/\/\*\s*(=|-){3,}/);
  });

  it("reserves a line on the value label so an empty trigger does not collapse", () => {
    expect(rule(".neuwo-combobox__value")).toContain("min-height: 1lh");
  });

  it("greys the placeholder text of the button trigger only, not what the user types into the searchable one", () => {
    expect(rule(".neuwo-combobox__trigger[data-placeholder] .neuwo-combobox__value")).toContain("var(--neuwo-color-grey-400)");
    expect(rule(".neuwo-combobox__trigger[data-placeholder]")).toBeNull();
  });

  it("marks the selected option with blue text and no check-mark gutter", () => {
    expect(rule('.neuwo-combobox__option[aria-selected="true"]')).toContain("color: var(--neuwo-color-blue)");
    expect(css).not.toContain(".neuwo-combobox__option::before");
  });

  it("hides a filtered-out row, which its own display rule would otherwise keep", () => {
    expect(rule(".neuwo-combobox__option[hidden]")).toContain("display: none");
  });

  it("wraps a long option label inside the list, which the positioner caps to the viewport", () => {
    expect(read("../src/components/popup.css")).toMatch(/:is\(\.neuwo-combobox__option\) \{[^}]*overflow-wrap: anywhere/);
  });

  it("tightens the chevron gutter at the compact size", () => {
    expect(rule(".neuwo-field--sm .neuwo-combobox__trigger")).toContain("padding-inline-end: var(--neuwo-space-8)");
    expect(rule(".neuwo-field--sm .neuwo-combobox__chevron")).toContain("inset-inline-end: var(--neuwo-space-3)");
  });

  it("lays the form value invisibly over the trigger, where the browser anchors its validation message", () => {
    expect(rule(".neuwo-combobox")).toContain("position: relative");
    const formValue = rule(".neuwo-combobox__form-value");
    for (const declaration of ["position: absolute", "inset: 0", "opacity: 0", "pointer-events: none"]) expect(formValue).toContain(declaration);
  });

  it("restates on the trigger the button chrome and the text defaults the inputs beside it keep", () => {
    const trigger = rule(".neuwo-combobox__trigger");
    for (const declaration of [
      "cursor: pointer",
      "text-align: start",
      "text-transform: none",
      "letter-spacing: normal",
      "word-spacing: normal",
      "text-indent: 0",
      "text-shadow: none",
      "font-style: normal",
      "font-variant: normal",
      "font-weight: normal",
      "line-height: normal",
      "white-space: normal",
    ]) {
      expect(trigger).toContain(declaration);
    }
  });

  it("selects only on its prefixed classes, never the bare ones", () => {
    expect(css).not.toMatch(/(^|[\s,}~>+])\.(combobox|field|input)\b/);
    expect(css).not.toContain(".is-active");
    expect(css).not.toContain(":host");
  });

  it("is in the reset's tag and block lists", () => {
    const reset = read("../src/components/reset.css");
    expect(reset).toContain("neuwo-combobox,");
    expect(reset).toContain('.neuwo-combobox, [class*="neuwo-combobox__"], [class*="neuwo-combobox--"]');
  });
});
