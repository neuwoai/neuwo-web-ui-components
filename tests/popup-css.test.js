import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { LIGHT_COMPONENT_CSS } from "../scripts/light-css.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(__dirname, "../src/components/popup.css"), "utf8");
const rule = (selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\:]/g, "\\$&");
  return new RegExp(`(^|[},])\\s*${escaped}\\s*\\{([^}]*)\\}`, "m").exec(css)?.[2] ?? null;
};

describe("popup.css recipe", () => {
  it("gives the popup panel its surface, border, radius, shadow and padding from tokens", () => {
    const panel = rule(":is(.neuwo-combobox__popup)");
    for (const value of [
      "var(--neuwo-color-surface-solid)",
      "1px solid var(--neuwo-glass-border)",
      "var(--neuwo-radius-lg)",
      "var(--neuwo-shadow-xl)",
      "var(--neuwo-space-2)",
      "color-scheme: dark",
    ]) {
      expect(panel).toContain(value);
    }
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("enters with neuwo-popup-in and stills it under reduced motion", () => {
    expect(rule(":is(.neuwo-combobox__popup):popover-open")).toContain("animation: neuwo-popup-in");
    expect(css).toContain("@keyframes neuwo-popup-in");
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*:popover-open\s*\{\s*animation:\s*none/);
  });

  it("gives the row its padding, radius, hover and keyboard tints", () => {
    expect(rule(":is(.neuwo-combobox__option)")).toContain("var(--neuwo-space-2) var(--neuwo-space-3)");
    expect(rule(":is(.neuwo-combobox__option)")).toContain("var(--neuwo-radius-md)");
    expect(rule(":is(.neuwo-combobox__option):hover")).toContain("var(--neuwo-tint-blue-10)");
    expect(rule(":is(.neuwo-combobox__option--active)")).toContain("var(--neuwo-tint-blue-15)");
    expect(rule(':is(.neuwo-combobox__option)[aria-disabled="true"]')).toContain("var(--neuwo-opacity-disabled)");
  });

  it("is listed after the reset and before every recipe", () => {
    expect(LIGHT_COMPONENT_CSS.indexOf("src/components/popup.css")).toBe(1);
  });
});
