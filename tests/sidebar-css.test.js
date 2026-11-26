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

const FALLBACK = "@supports not selector(::details-content) {";

/** The rules of the desktop block inside the fallback for a browser without `::details-content`. */
function fallback() {
  const at = code.indexOf(FALLBACK);
  if (at < 0) return [];
  const open = code.indexOf("{", at);
  const block = code.slice(open + 1, closing(code, open, "{", "}"));
  const media = block.indexOf(`@media ${DESKTOP} {`);
  if (media < 0) return [];
  const start = block.indexOf("{", media);
  return flatRules(block.slice(start + 1, closing(block, start, "{", "}")));
}

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
    expect([...new Set(code.match(/@media \([^)]*width[^)]*\)/g))].sort()).toEqual([`@media ${DESKTOP}`, `@media ${PHONE}`].sort());
  });

  it("keeps the menu button in the column from 48rem where ::details-content is missing, so the nav stays reachable", () => {
    expect(code.match(/@supports[^{]*\{/g)).toEqual([FALLBACK]);
    expect(code.indexOf(FALLBACK)).toBeGreaterThan(code.indexOf(`@media ${DESKTOP} {`));
    const rules = fallback();
    expect(of(rules, ".neuwo-sidebar__toggle")).toEqual({
      display: "block",
      "align-self": "flex-start",
      "margin-inline-start": "calc(var(--neuwo-space-2) - var(--neuwo-space-3))",
    });
    expect(of(rules, ".neuwo-sidebar")).toEqual({ "overflow-y": "auto" });
    expect(of(rules, ".neuwo-sidebar__after-nav")).toEqual({ "margin-block-start": "var(--neuwo-space-6)" });
    expect(of(rules, ".neuwo-sidebar__footer")).toEqual({ "margin-block-start": "var(--neuwo-space-6)" });
    expect(rules.flatMap((each) => each.selectors).sort()).toEqual([".neuwo-sidebar", ".neuwo-sidebar__after-nav", ".neuwo-sidebar__footer", ".neuwo-sidebar__toggle"]);
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
    const contents = base.filter((each) => each.declarations.get("display") === "contents").flatMap((each) => each.selectors);
    expect(contents).toEqual(["neuwo-sidebar:not([hidden])", "neuwo-nav-section:not([hidden])", "neuwo-nav-item:not([hidden])", ".neuwo-nav-section--link > .neuwo-nav-section__details"]);
    expect(code.match(/display:\s*contents/g)).toHaveLength(2);
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

  it("wraps actions too wide for the bar's row onto a row of their own below 48rem, kept at the bar's inline end", () => {
    expect(phone(".neuwo-sidebar__bar")).toMatchObject({ "flex-wrap": "wrap", "row-gap": "var(--neuwo-space-2)" });
    expect(phone(".neuwo-sidebar__actions")).toEqual({ "margin-inline-start": "auto" });
  });

  it("lays the brand's slotted link out as a flex box at one-class weight, so no line box stands the logo taller", () => {
    expect(rule(".neuwo-sidebar__brand > *")).toEqual({ display: "flex" });
    expect(base.flatMap((each) => each.selectors).filter((selector) => selector.startsWith(".neuwo-sidebar__brand >"))).toEqual([".neuwo-sidebar__brand > *"]);
  });

  it("rings only a folding section's name on keyboard focus, with the system's own ring, and leaves the linked section's toggle its ring", () => {
    expect(rule(".neuwo-nav-section__row:focus-visible")).toEqual({ outline: "none" });
    expect(rule(".neuwo-nav-section__row:focus-visible > .neuwo-nav-section__name")).toEqual({ outline: "auto" });
    const all = [...base, ...inside(PHONE), ...inside(DESKTOP), ...inside("(forced-colors: active)")];
    const outlines = all.filter((each) => [...each.declarations.keys()].some((property) => property.startsWith("outline")));
    expect(outlines.flatMap((each) => each.selectors).sort()).toEqual([".neuwo-nav-section__row:focus-visible", ".neuwo-nav-section__row:focus-visible > .neuwo-nav-section__name"]);
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

  it("strips the lists' markers and indents, all but a nested list's --neuwo-space-4 at the inline start", () => {
    expect(rule(".neuwo-sidebar__list")).toEqual({ margin: "0", padding: "0", "list-style": "none" });
    expect(rule(".neuwo-nav-section__list")).toEqual({ margin: "0", padding: "0", "list-style": "none", "padding-inline-start": "var(--neuwo-space-4)" });
  });

  it("lays a section's row out as a flex row, centred, with a --neuwo-space-1 gap, the whole row its pointer target", () => {
    expect(rule(".neuwo-nav-section__row")).toEqual({
      display: "flex",
      "align-items": "center",
      gap: "var(--neuwo-space-1)",
      "border-radius": "var(--neuwo-radius-md)",
      cursor: "pointer",
      "list-style": "none",
    });
  });

  it("drops every summary's marker", () => {
    for (const summary of [".neuwo-sidebar__toggle", ".neuwo-nav-section__row", ".neuwo-nav-section__toggle"]) {
      expect(rule(summary)["list-style"], summary).toBe("none");
      expect(rule(`${summary}::-webkit-details-marker`), summary).toEqual({ display: "none" });
    }
  });

  it("draws the chevron 16px at the row's inline end in --neuwo-color-text-muted, and --neuwo-color-text while the row is hovered", () => {
    const chevron = rule(".neuwo-nav-section__chevron");
    expect(chevron).toMatchObject({
      flex: "none",
      display: "block",
      "inline-size": "1rem",
      "block-size": "1rem",
      "margin-inline-start": "auto",
      "background-color": "var(--neuwo-color-text-muted)",
    });
    for (const property of ["mask", "-webkit-mask"]) {
      expect(chevron[property]).toContain("M6 9l6 6 6-6");
      expect(chevron[property]).toMatch(/center \/ contain no-repeat$/);
    }
    for (const hovered of [".neuwo-nav-section__row:hover > .neuwo-nav-section__chevron", ".neuwo-nav-section__toggle:hover > .neuwo-nav-section__chevron"]) {
      expect(rule(hovered), hovered).toEqual({ "background-color": "var(--neuwo-color-text)" });
    }
  });

  it("turns the chevron towards the inline end while the section is closed, mirrored right to left, over --neuwo-transition-fast", () => {
    const closed = ".neuwo-nav-section__details:not([open]) > summary > .neuwo-nav-section__chevron";
    expect(rule(closed)).toEqual({ transform: "rotate(-90deg)" });
    expect(rule(`${closed}:dir(rtl)`)).toEqual({ transform: "rotate(90deg)" });
    expect(rule(".neuwo-nav-section__chevron").transition).toBe("transform var(--neuwo-transition-fast), background-color var(--neuwo-transition-fast)");
    const sections = base.flatMap((each) => each.selectors).filter((selector) => selector.includes("neuwo-nav-section__details:not([open])"));
    for (const selector of sections) expect(selector, "only a section's own summary, never a nested one's").toContain("> summary >");
  });

  it("puts a linked section's toggle at the inline end of its link's row, and the nested list under both", () => {
    expect(rule(".neuwo-nav-section--link")).toEqual({
      display: "grid",
      "grid-template-columns": "minmax(0, 1fr) auto",
      "align-items": "center",
      "column-gap": "var(--neuwo-space-1)",
    });
    expect(rule(".neuwo-nav-section--link > .neuwo-nav-section__name")).toEqual({ "grid-column": "1", "grid-row": "1" });
    expect(rule(".neuwo-nav-section--link > .neuwo-nav-section__details")).toEqual({ display: "contents" });
    expect(rule(".neuwo-nav-section--link > .neuwo-nav-section__details::details-content")).toEqual({ "grid-column": "1 / -1", "grid-row": "2" });
    expect(rule(".neuwo-nav-section__toggle")).toEqual({
      "grid-column": "2",
      "grid-row": "1",
      display: "flex",
      padding: "var(--neuwo-space-1)",
      "margin-inline-end": "calc(-1 * var(--neuwo-space-1))",
      "border-radius": "var(--neuwo-radius-md)",
      cursor: "pointer",
      "list-style": "none",
    });
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

  it("keeps the menu icon and the chevron, hovered or not, visible in forced colours, in the system's text colour", () => {
    const forced = inside("(forced-colors: active)");
    expect(of(forced, ".neuwo-sidebar__toggle-icon")).toEqual({ background: "CanvasText" });
    for (const chevron of [
      ".neuwo-nav-section__chevron",
      ".neuwo-nav-section__row:hover > .neuwo-nav-section__chevron",
      ".neuwo-nav-section__toggle:hover > .neuwo-nav-section__chevron",
    ]) {
      expect(of(forced, chevron), chevron).toEqual({ "background-color": "CanvasText" });
    }
  });

  it("stills under reduced motion every transition and animation it declares, shorthand or longhand", () => {
    const still = inside("(prefers-reduced-motion: reduce)");
    const stilled = (declarations, family) =>
      family === "transition"
        ? declarations.transition === "none" || declarations["transition-property"] === "none" || /^0m?s$/.test(declarations["transition-duration"] ?? "")
        : declarations.animation === "none" || declarations["animation-name"] === "none";
    const FAMILIES = { transition: ["transition", "transition-property", "transition-duration"], animation: ["animation", "animation-name"] };
    let moving = 0;
    for (const each of [...base, ...inside(PHONE), ...inside(DESKTOP)]) {
      for (const [family, properties] of Object.entries(FAMILIES)) {
        if (!properties.some((property) => each.declarations.has(property))) continue;
        for (const selector of each.selectors) {
          moving++;
          expect(stilled(of(still, selector), family), `${selector} ${family}`).toBe(true);
        }
      }
    }
    expect(moving).toBeGreaterThan(0);
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
