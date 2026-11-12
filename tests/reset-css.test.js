import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { templates } from "../src/templates.js";
import { cases, renderChildren } from "./fixtures/template-cases.js";
import { flatRules } from "./fixtures/css-rules.js";
import { closing, compare, splitTopLevel, weight } from "./fixtures/specificity.js";

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../src/components/reset.css"), "utf8");

const INHERITED = Object.fromEntries(
  [
    "text-transform",
    "letter-spacing",
    "word-spacing",
    "line-height",
    "text-shadow",
    "font-family",
    "font-weight",
    "font-size",
    "font-style",
    "font-variant",
    "color",
    "text-align",
    "text-indent",
    "white-space",
  ].map((property) => [property, "inherit"]),
);
const BOX = {
  "box-sizing": "border-box",
  margin: "0",
  padding: "0",
  "box-shadow": "none",
  "text-decoration": "none",
  float: "none",
  transform: "none",
  "vertical-align": "baseline",
};
const SIZING = {
  width: "auto",
  height: "auto",
  "min-width": "auto",
  "min-height": "auto",
  "max-width": "none",
  "max-height": "none",
};

const rules = flatRules(css);
const source = css.replace(/\/\*[\s\S]*?\*\//g, "");

/** @param {string} opener */
const listsAfter = (opener) =>
  Array.from(source.matchAll(new RegExp(opener.replace(/[()]/g, "\\$&"), "g")), ({ index }) =>
    splitTopLevel(source.slice(index + opener.length, closing(source, index + opener.length - 1, "(", ")"))),
  );

const PSEUDO_ELEMENT = /::(before|after)$/;
const baseOf = (selector) => selector.replace(PSEUDO_ELEMENT, "");
const pseudoOf = (selector) => selector.match(PSEUDO_ELEMENT)?.[0] ?? "";

// The user agent's text defaults for a native text control.
const NATIVE = {
  "text-align": "start",
  "text-transform": "none",
  "letter-spacing": "normal",
  "word-spacing": "normal",
  "text-indent": "0",
  "text-shadow": "none",
  "font-style": "normal",
  "font-variant": "normal",
  "font-weight": "normal",
  "line-height": "normal",
  "white-space": "normal",
};

/**
 * The value the reset's cascade gives the element: the heaviest matching selector, the later one on a tie.
 * @param {Element} el
 * @param {string} property
 */
function winner(el, property) {
  let best = null;
  for (const rule of rules) {
    if (!rule.declarations.has(property)) continue;
    for (const selector of rule.selectors) {
      if (pseudoOf(selector) || !el.matches(selector)) continue;
      if (!best || compare(weight(selector), best.weight) >= 0) best = { weight: weight(selector), value: rule.declarations.get(property) };
    }
  }
  return best?.value;
}

describe("components reset", () => {
  it("lists the elements once, exactly those that have a template", () => {
    const lists = listsAfter(":where(").filter((list) => list.some((entry) => entry.startsWith("neuwo-")));
    expect(lists).toHaveLength(1);
    expect(lists[0]).toEqual(Object.keys(templates).sort());
    for (const rule of rules) for (const selector of rule.selectors) expect(selector).toMatch(/^:where\(neuwo-badge, /);
  });

  it("lists every block any template case renders once, matching the block, its elements and its modifiers", () => {
    const classesIn = (node) => [
      ...String(node.props.class ?? "").trim().split(/\s+/),
      ...node.children.filter((child) => typeof child === "object" && "tag" in child).flatMap(classesIn),
    ];
    const blocks = new Set();
    for (const [tag, list] of Object.entries(cases)) {
      for (const testCase of list) {
        const children = renderChildren(testCase.children).map(({ html, ...info }) => info);
        const root = templates[tag](testCase.attrs, { id: (suffix) => suffix, children });
        for (const name of classesIn(root)) if (name && !name.includes("__") && !name.includes("--")) blocks.add(name);
      }
    }
    const exact = [...blocks].sort().flatMap((block) => [`.${block}`, `[class*="${block}__"]`, `[class*="${block}--"]`]);
    const lists = listsAfter(":is(").filter((list) => list.some((entry) => entry.includes("neuwo-")));
    expect(lists).toHaveLength(1);
    expect(lists[0]).toEqual(exact);
  });

  it("resets a block's own nodes but not a class that only starts with a block's name", () => {
    document.body.innerHTML =
      `<neuwo-button><span class="neuwo-btn__label"></span><span class="neuwo-btn--solid"></span>` +
      `<span class="neuwo-btnx"></span><span class="neuwo-buttons"></span></neuwo-button>`;
    const reached = (el) => rules.some((rule) => rule.declarations.get("margin") === "0" && rule.selectors.some((selector) => el.matches(selector)));
    expect(Array.from(document.querySelectorAll("span"), reached)).toEqual([true, true, false, false]);
  });

  it("reverts every property of non-SVG block nodes and their ::before and ::after to the browser's, before the explicit list", () => {
    const at = rules.findIndex((rule) => rule.declarations.get("all") === "revert");
    expect(at).toBeGreaterThanOrEqual(0);
    expect(Object.fromEntries(rules[at].declarations)).toEqual({ all: "revert", direction: "revert", "unicode-bidi": "revert" });
    expect(rules[at].selectors.map(pseudoOf).sort()).toEqual(["", "::after", "::before"]);
    for (const selector of rules[at].selectors) expect(baseOf(selector)).toMatch(/:is\([^)]*\):where\(:not\(svg, svg \*\)\)$/);
    expect(at).toBeLessThan(rules.findIndex((rule) => rule.declarations.get("margin") === "0"));
  });

  it("keeps a hidden block node hidden after the revert, which drops the attribute's own display: none, and one hidden until found searchable", () => {
    document.body.innerHTML =
      `<neuwo-combobox><ul class="neuwo-combobox__listbox"><li class="neuwo-combobox__empty" hidden></li>` +
      `<li class="neuwo-combobox__option" hidden="until-found"></li><li class="neuwo-combobox__option"></li></ul></neuwo-combobox>`;
    const [empty, found, option] = document.querySelectorAll("li");
    expect(winner(empty, "display")).toBe("none");
    expect(winner(found, "display")).toBeUndefined();
    expect(winner(found, "content-visibility")).toBe("hidden");
    expect(winner(option, "display")).toBeUndefined();
    expect(winner(option, "content-visibility")).toBeUndefined();
    const revertAt = rules.findIndex((rule) => rule.declarations.get("all") === "revert");
    for (const [property, value] of [["display", "none"], ["content-visibility", "hidden"]]) {
      const at = rules.findIndex((rule) => rule.declarations.get(property) === value && rule.selectors.every((selector) => selector.includes(":is(")));
      expect(at, property).toBeGreaterThan(revertAt);
    }
  });

  it("keeps a page's list markers off block nodes, which the revert of ::before and ::after does not reach", () => {
    const markers = rules.filter((rule) => rule.selectors.some((selector) => selector.endsWith("::marker")));
    expect(markers).toHaveLength(1);
    expect(Object.fromEntries(markers[0].declarations)).toEqual({ content: "none" });
    expect(markers[0].selectors).toHaveLength(1);
    expect(markers[0].selectors[0]).toMatch(/^:where\(neuwo-badge, [^)]*\) :is\([^)]*\)::marker$/);
    expect(weight(markers[0].selectors[0])).toEqual([0, 1, 0]);
  });

  it("sets every reset property on block nodes and their ::before and ::after", () => {
    const blockRules = rules.filter((rule) => rule.selectors.every((selector) => selector.includes(":is(")));
    for (const [property, value] of Object.entries({ ...INHERITED, ...BOX, ...SIZING })) {
      const rule = blockRules.find((candidate) => candidate.declarations.get(property) === value);
      expect(rule, `${property}: ${value}`).toBeDefined();
      expect(rule.selectors.map(pseudoOf).sort(), property).toEqual(["", "::after", "::before"]);
      expect(new Set(rule.selectors.map(baseOf)).size, property).toBe(1);
    }
  });

  it("keeps the sizing declarations off svg, and only those", () => {
    for (const property of Object.keys(SIZING)) {
      const declaring = rules.filter((rule) => rule.declarations.has(property));
      expect(declaring.length, property).toBeGreaterThan(0);
      for (const rule of declaring) for (const selector of rule.selectors) expect(selector, property).toContain(":where(:not(svg))");
    }
    for (const property of Object.keys({ ...INHERITED, ...BOX })) {
      for (const rule of rules.filter((candidate) => candidate.declarations.has(property))) {
        for (const selector of rule.selectors) expect(selector, property).not.toContain("svg");
      }
    }
  });

  it("gives template-rendered native text controls their user agent text defaults back, and nothing else", () => {
    document.body.innerHTML =
      `<neuwo-input><div class="neuwo-field"><label class="neuwo-field__label">L</label>` +
      `<input class="neuwo-input"><textarea class="neuwo-input"></textarea><select class="neuwo-input"></select>` +
      `<span class="neuwo-field__error"></span></div></neuwo-input>`;
    for (const tag of ["input", "textarea", "select"]) {
      const el = document.querySelector(tag);
      for (const [property, value] of Object.entries(NATIVE)) {
        expect(winner(el, property), `${tag} ${property}`).toBe(tag === "textarea" && property === "white-space" ? "pre-wrap" : value);
      }
      expect(winner(el, "color"), `${tag} color`).toBe("inherit");
    }
    for (const el of [document.querySelector("label"), document.querySelector("span")]) {
      for (const property of Object.keys(NATIVE)) expect(winner(el, property), `${el.localName} ${property}`).toBe("inherit");
    }
    const author = document.createElement("input");
    document.querySelector(".neuwo-field").append(author);
    expect(winner(author, "text-align")).toBeUndefined();
  });

  it("restores those defaults after the inherit block, in one rule for every native text control", () => {
    const inheritAt = rules.findIndex((rule) => rule.declarations.get("text-align") === "inherit");
    const nativeAt = rules.findIndex((rule) => rule.declarations.get("text-align") === "start");
    expect(nativeAt).toBeGreaterThan(inheritAt);
    expect(rules[nativeAt].selectors).toHaveLength(1);
    expect(rules[nativeAt].selectors[0]).toMatch(/:is\([^)]*\):where\(input, textarea, select\)$/);
    expect(Object.fromEntries(rules[nativeAt].declarations)).toEqual(NATIVE);
  });

  it("returns the button's minimum size to auto over a page `button { min-width: 300px }`", () => {
    document.body.innerHTML = `<neuwo-button><button class="neuwo-btn neuwo-btn--solid" type="button">Go</button></neuwo-button>`;
    const button = document.querySelector("button");
    for (const property of ["min-width", "min-height"]) {
      const winning = rules
        .flatMap((rule) => rule.selectors.filter((selector) => !pseudoOf(selector) && button.matches(selector)).map((selector) => ({ rule, selector })))
        .filter(({ rule }) => rule.declarations.has(property));
      expect(winning, property).toHaveLength(1);
      expect(winning[0].rule.declarations.get(property), property).toBe("auto");
      expect(compare(weight(winning[0].selector), weight("button")), property).toBeGreaterThan(0);
    }
  });

  it("weighs no selector above one class, pseudo-elements aside", () => {
    expect(weight(":where(#a, .b) :is(span, .c)::before")).toEqual([0, 1, 0]);
    expect(weight("button.neuwo-btn")).toEqual([0, 1, 1]);
    expect(weight(":is([class^=\"x\"]):not(svg)")).toEqual([0, 1, 1]);
    const selectors = rules.flatMap((rule) => rule.selectors);
    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) expect(compare(weight(selector), [0, 1, 0]), selector).toBeLessThanOrEqual(0);
  });
});
