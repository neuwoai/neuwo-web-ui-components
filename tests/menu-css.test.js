import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { LIGHT_COMPONENT_CSS } from "../scripts/light-css.js";
import { flatRules } from "./fixtures/css-rules.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(__dirname, "..", path), "utf8");
const css = read("src/components/menu/menu.css");
const popup = read("src/components/popup.css");
const tokens = read("src/foundation/tokens.css");
const code = css.replace(/\/\*[\s\S]*?\*\//g, "");

const outside = (source) => source.replace(/@media \((forced-colors|prefers-reduced-motion)[^{]*\{[\s\S]*?\}\s*\}/g, "");
const rules = flatRules(outside(css));
const rule = (selector) => Object.fromEntries(rules.filter((each) => each.selectors.includes(selector)).flatMap((each) => [...each.declarations]));
const block = (media) => {
  const at = code.indexOf(`@media (${media})`);
  return at < 0 ? null : flatRules(code.slice(code.indexOf("{", at) + 1));
};

describe("menu.css recipe", () => {
  it("is listed with the recipes, after the shared popup sheet", () => {
    expect(LIGHT_COMPONENT_CSS).toContain("src/components/menu/menu.css");
    expect(LIGHT_COMPONENT_CSS.indexOf("src/components/menu/menu.css")).toBeGreaterThan(LIGHT_COMPONENT_CSS.indexOf("src/components/popup.css"));
  });

  it("uses tokens only, with no hex colour and no colour name", () => {
    expect(code).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(code.replace(/url\([^)]*\)/g, "")).not.toMatch(/:\s*(white|black|red|green|blue)\b/);
    expect(code).toContain("var(--neuwo-");
  });

  it("keeps the element-name rules to the outer boxes", () => {
    expect(rule("neuwo-menu:not([hidden])")).toEqual({ display: "contents" });
    expect(rule("neuwo-menu-group:not([hidden])")).toEqual({ display: "block" });
    expect(rule("neuwo-menu-item:not([hidden])")).toEqual({ display: "block" });
  });

  it("shares the combobox's panel, row, hover and keyboard row, the Back row's too, entering with its keyframes", () => {
    expect(popup).toContain(":is(.neuwo-combobox__popup, .neuwo-menu) {");
    expect(popup).toContain(":is(.neuwo-combobox__popup, .neuwo-menu):popover-open {\n  animation: neuwo-popup-in");
    expect(popup).toContain(":is(.neuwo-combobox__option, .neuwo-menu-item__control, .neuwo-menu__back) {");
    expect(popup).toContain(':is(.neuwo-combobox__option, .neuwo-menu-item__control, .neuwo-menu__back):hover,\n.neuwo-menu-item__control:where([aria-expanded="true"]) {');
    expect(popup).toContain(":is(.neuwo-combobox__option--active, .neuwo-menu-item__control:where(:focus-visible), .neuwo-menu__back:where(:focus-visible)) {");
    expect(popup).toContain(':is(.neuwo-combobox__option, .neuwo-menu-item__control)[aria-disabled="true"] {');
  });

  it("stills the panel's entrance under reduced motion", () => {
    expect(popup).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*:is\(\.neuwo-combobox__popup, \.neuwo-menu\):popover-open\s*\{\s*animation:\s*none;/);
  });

  it("slides a drilled submenu in from the inline end, mirrored by the dir attribute, and stills it under reduced motion", () => {
    expect(rule(".neuwo-menu--drill:popover-open")).toEqual({ animation: "neuwo-menu-drill-in var(--neuwo-transition-fast)" });
    expect(rule(".neuwo-menu--drill:dir(rtl):popover-open")).toEqual({ "animation-name": "neuwo-menu-drill-in-rtl" });
    expect(code).toMatch(/@keyframes neuwo-menu-drill-in \{\s*from \{ opacity: 0; translate: 0\.75rem 0; \}\s*\}/);
    expect(code).toMatch(/@keyframes neuwo-menu-drill-in-rtl \{\s*from \{ opacity: 0; translate: -0\.75rem 0; \}\s*\}/);
    expect(code.match(/@keyframes [\w-]+/g)).toEqual(["@keyframes neuwo-menu-drill-in", "@keyframes neuwo-menu-drill-in-rtl"]);
    const still = block("prefers-reduced-motion: reduce");
    const stilled = still?.find((each) => each.selectors.includes(".neuwo-menu--drill:popover-open"));
    expect(stilled?.selectors).toEqual([".neuwo-menu--drill:popover-open", ".neuwo-menu--drill:dir(rtl):popover-open"]);
    expect(Object.fromEntries(stilled?.declarations ?? [])).toEqual({ animation: "none" });
  });

  it("hides a panel a drilled submenu covers, but not the submenu inside it, nor a deeper covered one", () => {
    expect(rule(".neuwo-menu--covered")).toEqual({ visibility: "hidden" });
    expect(rule(".neuwo-menu--covered .neuwo-menu:not(.neuwo-menu--covered)")).toEqual({ visibility: "visible" });
  });

  it("lays the Back row out as an item, muted and semibold, its chevron pointing to the inline start, a divider below it", () => {
    expect(rule(".neuwo-menu__back:not([hidden])")).toMatchObject({ display: "flex", "align-items": "center", gap: "var(--neuwo-space-3)", "inline-size": "100%" });
    expect(rule(".neuwo-menu__back")).toEqual({ color: "var(--neuwo-color-text-muted)", "font-weight": "var(--neuwo-font-weight-semibold)" });
    expect(rule(".neuwo-menu__back:focus-visible").outline).toBe("var(--neuwo-outline-focus)");
    expect(rule(".neuwo-menu__back-icon")).toMatchObject({
      "inline-size": "1.125em",
      transform: "rotate(90deg)",
      mask: "var(--neuwo-icon-chevron) center / contain no-repeat",
      "background-color": "var(--neuwo-color-text-muted)",
    });
    expect(rule(".neuwo-menu__back-icon:dir(rtl)")).toEqual({ transform: "rotate(-90deg)" });
    expect(rule(".neuwo-menu__back:not([hidden]) + .neuwo-menu__items")).toEqual({
      "margin-block-start": "var(--neuwo-space-2)",
      "margin-inline": "calc(-1 * var(--neuwo-space-2))",
      "padding-block-start": "var(--neuwo-space-2)",
      "padding-inline": "var(--neuwo-space-2)",
      "border-block-start": "1px solid var(--neuwo-glass-border)",
    });
  });

  it("sizes the panel between 13rem and 20rem, never taller than the viewport less a margin, scrolling inside", () => {
    expect(rule(".neuwo-menu")).toMatchObject({
      position: "fixed",
      inset: "auto",
      "min-inline-size": "13rem",
      "max-inline-size": "20rem",
      "max-block-size": "calc(100dvh - 2 * var(--neuwo-space-2))",
      "overflow-y": "auto",
      "font-size": "var(--neuwo-font-size-sm)",
    });
  });

  it("lays the item out in a row and suppresses the browser's ring on the tinted keyboard row", () => {
    expect(rule(".neuwo-menu-item__control")).toMatchObject({ display: "flex", "align-items": "center", gap: "var(--neuwo-space-3)", "inline-size": "100%" });
    expect(rule(".neuwo-menu-item__control:focus-visible").outline).toBe("var(--neuwo-outline-focus)");
  });

  it("mutes the start icon, blue on hover unless disabled", () => {
    expect(rule(".neuwo-menu-item__start").color).toBe("var(--neuwo-color-text-muted)");
    expect(rule('.neuwo-menu-item__control:not([aria-disabled="true"]):hover > .neuwo-menu-item__start').color).toBe("var(--neuwo-color-blue)");
  });

  it("sets the hint and the heading muted and small, the hint at the inline end", () => {
    expect(rule(".neuwo-menu-item__hint")).toMatchObject({
      "margin-inline-start": "auto",
      color: "var(--neuwo-color-text-muted)",
      "font-size": "var(--neuwo-font-size-xs)",
    });
    expect(rule(".neuwo-menu-group__heading")).toEqual({
      padding: "var(--neuwo-space-2) var(--neuwo-space-3) var(--neuwo-space-1)",
      color: "var(--neuwo-color-text-muted)",
      "font-size": "var(--neuwo-font-size-xs)",
    });
  });

  it("draws the divider edge to edge, only after a group that shows and without --no-divider, and hides a group with no item shown", () => {
    const shown = ":not([hidden]):has(> .neuwo-menu-group > .neuwo-menu-group__items > :not([hidden]))";
    expect(rule(".neuwo-menu-group__divider")).toEqual({
      display: "none",
      "block-size": "1px",
      "margin-block": "var(--neuwo-space-2)",
      "margin-inline": "calc(-1 * var(--neuwo-space-2))",
      background: "var(--neuwo-glass-border)",
    });
    expect(rule(`.neuwo-menu__items > ${shown} ~ * > .neuwo-menu-group:not(.neuwo-menu-group--no-divider) > .neuwo-menu-group__divider`)).toEqual({ display: "block" });
    expect(code).not.toContain(":first-child");
    expect(rule(".neuwo-menu-group--no-divider > .neuwo-menu-group__divider")).toEqual({});
    expect(rule(".neuwo-menu-group:not(:has(> .neuwo-menu-group__items > :not([hidden])))")).toEqual({ display: "none" });
  });

  it("shows a checked item's check, or its dot in a select=one group, in blue", () => {
    expect(rule(".neuwo-menu-item__check")).toMatchObject({
      visibility: "hidden",
      mask: "var(--neuwo-icon-check) center / contain no-repeat",
      "-webkit-mask": "var(--neuwo-icon-check) center / contain no-repeat",
    });
    expect(rule('.neuwo-menu-item__control[role="menuitemradio"] > .neuwo-menu-item__check')).toEqual({
      "mask-image": "var(--neuwo-icon-dot)",
      "-webkit-mask-image": "var(--neuwo-icon-dot)",
    });
    expect(rule('.neuwo-menu-item__control[aria-checked="true"]')).toEqual({ color: "var(--neuwo-color-blue)" });
    expect(rule('.neuwo-menu-item__control[aria-checked="true"] > .neuwo-menu-item__check')).toEqual({ visibility: "visible" });
  });

  it("colours both tones' label and icon, hover included, and tints their hover", () => {
    for (const [tone, colour, tint] of [
      ["red", "var(--neuwo-color-red)", "color-mix(in srgb, var(--neuwo-color-red) 12%, transparent)"],
      ["green", "var(--neuwo-color-green)", "var(--neuwo-tint-green-10)"],
    ]) {
      const control = `.neuwo-menu-item--${tone} > .neuwo-menu-item__control`;
      for (const selector of [control, `${control} > .neuwo-menu-item__start`, `${control}:hover > .neuwo-menu-item__start`]) {
        expect(rule(selector).color, selector).toBe(colour);
      }
      expect(rule(`${control}:hover`).background).toBe(tint);
    }
  });

  it("gives a disabled row no hover tint, after the tones", () => {
    const disabled = '.neuwo-menu-item__control[aria-disabled="true"]:hover';
    expect(rule(disabled)).toEqual({ background: "none" });
    expect(code.indexOf(disabled)).toBeGreaterThan(code.indexOf(".neuwo-menu-item--green > .neuwo-menu-item__control:hover"));
  });

  it("turns the chevron to point to the inline end in either direction", () => {
    expect(rule(".neuwo-menu-item__chevron")).toMatchObject({
      transform: "rotate(-90deg)",
      mask: "var(--neuwo-icon-chevron) center / contain no-repeat",
    });
    expect(rule(".neuwo-menu-item__chevron:dir(rtl)")).toEqual({ transform: "rotate(90deg)" });
  });

  it("pushes only the first mark after the label to the inline end, so a hint and a chevron or link mark stay together", () => {
    for (const mark of ["external", "chevron"]) {
      expect(rule(`.neuwo-menu-item__label + .neuwo-menu-item__${mark}`), mark).toEqual({ "margin-inline-start": "auto" });
      expect(rule(`.neuwo-menu-item__${mark}`)["margin-inline-start"], mark).toBeUndefined();
    }
  });

  it("hides the new-tab text visually only", () => {
    expect(rule(".neuwo-menu-item__new-tab")).toMatchObject({ position: "absolute", "inline-size": "1px", "block-size": "1px", overflow: "hidden", "clip-path": "inset(50%)" });
    expect(rule(".neuwo-menu-item__control").position).toBe("relative");
  });

  it("reads the chevron, the check and the dot from tokens, which the combobox and the checkbox read too", () => {
    for (const name of ["chevron", "check", "dot"]) expect(tokens).toMatch(new RegExp(`--neuwo-icon-${name}: url\\("data:image/svg\\+xml,[^"]*"\\);`));
    expect(read("src/components/fields/combobox/combobox.css")).toContain("mask: var(--neuwo-icon-chevron) center / contain no-repeat;");
    const check = read("src/components/selection/form-check.css");
    expect(check).toContain("mask: var(--neuwo-icon-check) center / 0.8rem no-repeat;");
    expect(check).toContain("mask: var(--neuwo-icon-dot) center / contain no-repeat;");
    expect(code.match(/url\(/g)).toHaveLength(2);
  });

  it("keeps the masks, the dividers and the focused row visible under forced colours", () => {
    const forced = block("forced-colors: active");
    const of = (selector) => Object.fromEntries(forced.find((each) => each.selectors.includes(selector))?.declarations ?? []);
    for (const selector of [".neuwo-menu-item__check", ".neuwo-menu-item__external", ".neuwo-menu-item__chevron", ".neuwo-menu__back-icon", ".neuwo-menu-group__divider"]) {
      expect(of(selector), selector).toEqual({ background: "CanvasText" });
    }
    expect(of(".neuwo-menu-item__control:focus-visible")).toEqual({ "outline-color": "Highlight" });
  });
});
