import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { LIGHT_COMPONENT_CSS } from "../scripts/light-css.js";
import { flatRules } from "./fixtures/css-rules.js";
import { closing } from "./fixtures/specificity.js";

// Off disk, since Vitest resolves a CSS `?raw` import to an empty string.
const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(__dirname, "..", path), "utf8");
const css = read("src/components/sidebar/sidebar.css");
const tokens = read("src/foundation/tokens.css");
const code = css.replace(/\/\*[\s\S]*?\*\//g, "");

const PHONE = "(width < 48rem)";
const DESKTOP = "(width >= 48rem)";
const KNOBS = ["--neuwo-sidebar-width", "--neuwo-logo-height", "--neuwo-nav-link-gutter"];

/** @param {string} source */
function outsideMedia(source) {
  let out = source;
  for (let at = out.indexOf("@media"); at >= 0; at = out.indexOf("@media")) out = out.slice(0, at) + out.slice(closing(out, out.indexOf("{", at), "{", "}") + 1);
  return out;
}

/** @param {string} query */
function inside(query) {
  const at = code.indexOf(`@media ${query} {`);
  if (at < 0) return [];
  const open = code.indexOf("{", at);
  return flatRules(code.slice(open + 1, closing(code, open, "{", "}")));
}

/**
 * The declarations every rule naming `selector` gives it, in order.
 * @param {ReturnType<typeof flatRules>} rules
 * @param {string} selector
 */
const of = (rules, selector) => Object.fromEntries(rules.filter((each) => each.selectors.includes(selector)).flatMap((each) => [...each.declarations]));

const base = flatRules(outsideMedia(code));
const rule = (selector) => of(base, selector);
const phone = (selector) => of(inside(PHONE), selector);
const desktop = (selector) => of(inside(DESKTOP), selector);

describe("sidebar.css recipe", () => {
  it("is listed with the recipes, after the menu's", () => {
    expect(LIGHT_COMPONENT_CSS.indexOf("src/components/sidebar/sidebar.css")).toBe(LIGHT_COMPONENT_CSS.indexOf("src/components/menu/menu.css") + 1);
  });

  it("keeps the element-name rules to the three hosts' outer boxes, which draw no box", () => {
    for (const tag of ["neuwo-sidebar", "neuwo-nav-section", "neuwo-nav-item"]) expect(rule(`${tag}:not([hidden])`), tag).toEqual({ display: "contents" });
    expect(code.match(/(^|[},\s])neuwo-[\w-]+[\s,{[:]/g)).toHaveLength(3);
  });

  it("reads the column's width from --neuwo-sidebar-width with a 17rem fallback, never declaring it", () => {
    expect(code).not.toMatch(/--neuwo-sidebar-width\s*:/);
    expect(desktop(".neuwo-sidebar")).toMatchObject({
      flex: "0 0 var(--neuwo-sidebar-width, 17rem)",
      "inline-size": "var(--neuwo-sidebar-width, 17rem)",
    });
  });

  it("turns from a bar into the column at 48rem, and at no other width", () => {
    expect(code.match(/@media \([^)]*width[^)]*\)/g).sort()).toEqual([`@media ${DESKTOP}`, `@media ${PHONE}`].sort());
  });

  it("stands the column sticky at the top, the full viewport tall, from 48rem", () => {
    expect(desktop(".neuwo-sidebar")).toMatchObject({
      position: "sticky",
      "inset-block-start": "0",
      "block-size": "100vh",
      gap: "var(--neuwo-space-6)",
      "padding-block": "var(--neuwo-space-8) var(--neuwo-space-6)",
      "padding-inline": "var(--neuwo-space-6)",
      "border-inline-end": "1px solid var(--neuwo-glass-border)",
    });
    expect(rule(".neuwo-sidebar")).toMatchObject({ display: "flex", "flex-direction": "column", "box-sizing": "border-box" });
  });

  it("shows the menu's content from 48rem whatever its open state, as a flex column through ::details-content, hiding the toggle and the actions", () => {
    expect(desktop(".neuwo-sidebar__menu::details-content")).toEqual({
      "content-visibility": "visible",
      display: "flex",
      "flex-direction": "column",
      gap: "var(--neuwo-space-6)",
      flex: "1 1 auto",
      "min-block-size": "0",
    });
    expect(desktop(".neuwo-sidebar__menu")).toEqual({ display: "flex", "flex-direction": "column", flex: "1 1 auto", "min-block-size": "0" });
    expect(desktop(".neuwo-sidebar__toggle").display).toBe("none");
    expect(desktop(".neuwo-sidebar__actions").display).toBe("none");
    for (const each of inside(DESKTOP)) for (const selector of each.selectors) expect(selector).not.toMatch(/\[open\]/);
    expect(code.match(/display:\s*contents/g)).toHaveLength(1);
  });

  it("centres the brand and sizes its logo 10rem wide from 48rem, 7rem wide and at the start below", () => {
    expect(desktop(".neuwo-sidebar__brand")).toEqual({
      "--neuwo-logo-height": "calc(10rem / 6.4)",
      display: "flex",
      "align-items": "center",
      "justify-content": "center",
    });
    expect(phone(".neuwo-sidebar__brand")).toEqual({
      "--neuwo-logo-height": "calc(7rem / 6.4)",
      display: "flex",
      "align-items": "center",
      "justify-content": "start",
    });
  });

  it("lets the nav take the slack and scroll on its own from 48rem, its scrollbar along the column's border", () => {
    expect(desktop(".neuwo-sidebar__nav")).toEqual({
      flex: "1 1 auto",
      "min-block-size": "0",
      "overflow-y": "auto",
      "margin-inline-end": "calc(-1 * var(--neuwo-space-6))",
      "padding-inline-end": "var(--neuwo-space-6)",
      "scrollbar-width": "thin",
    });
  });

  it("pins the bar to the top below 48rem, glass on --neuwo-z-header with a border along the bottom", () => {
    expect(phone(".neuwo-sidebar")).toEqual({
      position: "sticky",
      "inset-block-start": "0",
      "z-index": "var(--neuwo-z-header)",
      "border-block-end": "1px solid var(--neuwo-glass-border)",
      background: "var(--neuwo-glass-bg)",
      "-webkit-backdrop-filter": "blur(var(--neuwo-glass-blur))",
      "backdrop-filter": "blur(var(--neuwo-glass-blur))",
    });
    expect(phone(".neuwo-sidebar__bar")).toMatchObject({ display: "flex", "align-items": "center", "justify-content": "space-between", "padding-block": "var(--neuwo-space-2)" });
  });

  it("puts the menu button in the bar's inline-end corner below 48rem, the sticky aside its containing block, and keeps the bar clear of it", () => {
    const toggle = "2 * var(--neuwo-space-3) + var(--neuwo-space-6)";
    expect(phone(".neuwo-sidebar__toggle")).toEqual({
      position: "absolute",
      "inset-block-start": "var(--neuwo-space-2)",
      "inset-inline-end": "var(--neuwo-space-4)",
      display: "block",
    });
    expect(rule(".neuwo-sidebar__menu").position).toBeUndefined();
    expect(phone(".neuwo-sidebar__menu").position).toBeUndefined();
    expect(phone(".neuwo-sidebar__bar")).toMatchObject({
      "min-block-size": `calc(2 * var(--neuwo-space-2) + ${toggle})`,
      "padding-inline": `var(--neuwo-space-4) calc(var(--neuwo-space-4) + ${toggle})`,
    });
    expect(rule(".neuwo-sidebar__toggle")).toMatchObject({ padding: "var(--neuwo-space-3)", "border-radius": "var(--neuwo-radius-md)", background: "none", color: "var(--neuwo-color-heading)" });
    expect(rule(".neuwo-sidebar__toggle-icon")).toMatchObject({ "inline-size": "var(--neuwo-space-6)", "block-size": "var(--neuwo-space-6)" });
  });

  it("caps the open nav at calc(100vh - 8rem) below 48rem, scrolling inside it, and spaces the after-nav place and the footer", () => {
    expect(phone(".neuwo-sidebar__nav")).toEqual({
      "max-block-size": "calc(100vh - 8rem)",
      "overflow-y": "auto",
      "padding-inline": "var(--neuwo-space-4)",
    });
    expect(phone(".neuwo-sidebar__after-nav")).toEqual({ "margin-inline": "var(--neuwo-space-4)" });
    expect(phone(".neuwo-sidebar__footer")).toEqual({ margin: "var(--neuwo-space-4)" });
  });

  it("rules the footer off with a glass border and takes out a place nothing fills", () => {
    expect(rule(".neuwo-sidebar__footer")).toEqual({ "padding-block-start": "var(--neuwo-space-4)", "border-block-start": "1px solid var(--neuwo-glass-border)" });
    expect(rule(".neuwo-sidebar__after-nav:empty")).toEqual({ display: "none" });
    expect(rule(".neuwo-sidebar__footer:empty")).toEqual({ display: "none" });
  });

  it("strips the list's markers and indents", () => {
    expect(rule(".neuwo-sidebar__list")).toEqual({ margin: "0", padding: "0", "list-style": "none" });
  });

  it("sets the nav-link gutter to --neuwo-space-2 inside the sidebar, outranking the recipe's own", () => {
    expect(rule(".neuwo-sidebar .neuwo-nav-link")).toEqual({ "--neuwo-nav-link-gutter": "var(--neuwo-space-2)" });
  });

  it("draws the menu icon as a mask over currentColor, three lines, a cross while the menu is open", () => {
    const icon = rule(".neuwo-sidebar__toggle-icon");
    expect(icon.background).toBe("currentColor");
    for (const property of ["mask", "-webkit-mask"]) {
      expect(icon[property]).toContain("M4 7h16M4 12h16M4 17h16");
      expect(icon[property]).toMatch(/center \/ contain no-repeat$/);
    }
    const open = rule(".neuwo-sidebar__menu[open] .neuwo-sidebar__toggle-icon");
    for (const property of ["mask-image", "-webkit-mask-image"]) expect(open[property]).toContain("M6 6l12 12M18 6L6 18");
  });

  it("drops the summary's marker", () => {
    expect(rule(".neuwo-sidebar__toggle")["list-style"]).toBe("none");
    expect(rule(".neuwo-sidebar__toggle::-webkit-details-marker")).toEqual({ display: "none" });
  });

  it("keeps the menu icon visible in forced colours, in the system's text colour", () => {
    const forced = inside("(forced-colors: active)");
    expect(of(forced, ".neuwo-sidebar__toggle-icon")).toEqual({ background: "CanvasText" });
  });

  it("stills under reduced motion every transition and animation it declares", () => {
    const still = inside("(prefers-reduced-motion: reduce)");
    for (const each of [...base, ...inside(PHONE), ...inside(DESKTOP)]) {
      for (const property of ["transition", "animation"]) {
        if (!each.declarations.has(property)) continue;
        for (const selector of each.selectors) expect(of(still, selector)[property], `${selector} ${property}`).toBe("none");
      }
    }
  });

  it("uses tokens only, and only tokens that tokens.css defines", () => {
    expect(code.replace(/url\([^)]*\)/g, "")).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(/);
    expect(code.replace(/url\([^)]*\)/g, "")).not.toMatch(/:\s*(white|black|red|green|blue)\b/);
    for (const [, token] of code.matchAll(/var\((--neuwo-[\w-]+)/g)) {
      if (KNOBS.includes(token)) continue;
      expect(tokens, token).toContain(`${token}:`);
    }
  });
});
