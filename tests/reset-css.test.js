import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { templates } from "../src/templates.js";

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

function splitTopLevel(list) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < list.length; i++) {
    if (list[i] === "(" || list[i] === "[") depth++;
    else if (list[i] === ")" || list[i] === "]") depth--;
    else if (list[i] === "," && depth === 0) {
      parts.push(list.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(list.slice(start).trim());
  return parts.filter(Boolean);
}

function closing(text, from, open, close) {
  let depth = 0;
  for (let i = from; i < text.length; i++) {
    if (text[i] === open) depth++;
    else if (text[i] === close && --depth === 0) return i;
  }
  throw new Error(`unbalanced ${open} in ${text}`);
}

const rules = Array.from(css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g), ([, selectors, body]) => ({
  selectors: splitTopLevel(selectors),
  declarations: new Map(
    body
      .split(";")
      .map((declaration) => declaration.split(":").map((part) => part.trim()))
      .filter(([property]) => property)
      .map(([property, ...value]) => [property, value.join(":")]),
  ),
}));

const PSEUDO_ELEMENT = /::(before|after)$/;
const baseOf = (selector) => selector.replace(PSEUDO_ELEMENT, "");
const pseudoOf = (selector) => selector.match(PSEUDO_ELEMENT)?.[0] ?? "";

function weight(selector) {
  const total = [0, 0, 0];
  const add = ([a, b, c]) => {
    total[0] += a;
    total[1] += b;
    total[2] += c;
  };
  let i = 0;
  while (i < selector.length) {
    const char = selector[i];
    if (char === "[") {
      i = closing(selector, i, "[", "]") + 1;
      add([0, 1, 0]);
    } else if (char === "#" || char === ".") {
      i = selector.slice(i + 1).search(/[^\w-]|$/) + i + 1;
      add(char === "#" ? [1, 0, 0] : [0, 1, 0]);
    } else if (char === ":") {
      const element = selector[i + 1] === ":";
      const name = /^:{1,2}([\w-]+)/.exec(selector.slice(i))[1];
      i += (element ? 2 : 1) + name.length;
      let args = null;
      if (selector[i] === "(") {
        const end = closing(selector, i, "(", ")");
        args = selector.slice(i + 1, end);
        i = end + 1;
      }
      if (element || name === "where") continue;
      if (["is", "not", "has"].includes(name) && args !== null) {
        add(
          splitTopLevel(args)
            .map(weight)
            .reduce((max, next) => (compare(next, max) > 0 ? next : max), [0, 0, 0]),
        );
      } else add([0, 1, 0]);
    } else if (/[a-zA-Z]/.test(char)) {
      i = selector.slice(i).search(/[^\w-]|$/) + i;
      add([0, 0, 1]);
    } else i++;
  }
  return total;
}

function compare(left, right) {
  for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] - right[i];
  return 0;
}

describe("components reset", () => {
  it("scopes every rule to exactly the elements that have a template", () => {
    const lists = Array.from(css.matchAll(/^:where\(([^)]*)\)/gm), ([, list]) => list.split(",").map((tag) => tag.trim()));
    expect(lists.length).toBeGreaterThan(0);
    for (const list of lists) expect(list).toEqual(Object.keys(templates).sort());
  });

  it("matches nodes by the root block of every registered template", () => {
    const blocks = Object.values(templates)
      .map((template) => template({}, { id: (suffix) => suffix, children: [] }).props.class)
      .map((classes) => String(classes).trim().split(/\s+/)[0])
      .sort();
    const pairs = blocks.flatMap((block) => [`[class^="${block}"]`, `[class*=" ${block}"]`]);
    const lists = Array.from(css.matchAll(/:is\(/g), ({ index }) => splitTopLevel(css.slice(index + 4, closing(css, index + 3, "(", ")"))));
    expect(lists.length).toBeGreaterThan(0);
    for (const list of lists) expect(list).toEqual(pairs);
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
