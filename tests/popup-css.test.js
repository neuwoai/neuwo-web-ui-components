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
  it("gives the combobox's and the menu's panel its surface, border, radius, shadow and padding from tokens", () => {
    const panel = rule(":is(.neuwo-combobox__popup, .neuwo-menu)");
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
    expect(rule(":is(.neuwo-combobox__popup, .neuwo-menu):popover-open")).toContain("animation: neuwo-popup-in");
    expect(css).toContain("@keyframes neuwo-popup-in");
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*:is\(\.neuwo-combobox__popup, \.neuwo-menu\):popover-open\s*\{\s*animation:\s*none;/);
  });

  it("gives the combobox's option, the menu's item and its Back row the row padding, radius, hover and keyboard tints", () => {
    const row = ":is(.neuwo-combobox__option, .neuwo-menu-item__control, .neuwo-menu__back)";
    expect(rule(row)).toContain("var(--neuwo-space-2) var(--neuwo-space-3)");
    expect(rule(row)).toContain("var(--neuwo-radius-md)");
    expect(rule(`${row}:hover,\n.neuwo-menu-item__control:where([aria-expanded="true"])`)).toContain("var(--neuwo-tint-blue-10)");
    expect(css.indexOf('.neuwo-menu-item__control:where([aria-expanded="true"])'), "the keyboard row comes later and weighs the same, so it shows on an open submenu's item").toBeLessThan(css.indexOf(".neuwo-menu__back:where(:focus-visible)"));
    expect(rule(":is(.neuwo-combobox__option--active, .neuwo-menu-item__control:where(:focus-visible), .neuwo-menu__back:where(:focus-visible))")).toContain("var(--neuwo-tint-blue-15)");
    expect(rule(':is(.neuwo-combobox__option, .neuwo-menu-item__control)[aria-disabled="true"]')).toContain("var(--neuwo-opacity-disabled)");
    expect(css, "the keyboard row weighs one class, so a hovered row outweighs it as before").not.toMatch(/(__control|__back):focus-visible/);
  });

  it("gives the menu's panel the theme's palette under forced colours, as the combobox's", () => {
    expect(css).toMatch(/@media \(forced-colors: active\) \{[\s\S]*?:is\(\.neuwo-combobox__popup, \.neuwo-menu\) \{\s*color-scheme: light dark;/);
  });

  it("is listed after the reset and before every recipe", () => {
    expect(LIGHT_COMPONENT_CSS.indexOf("src/components/popup.css")).toBe(1);
  });
});
