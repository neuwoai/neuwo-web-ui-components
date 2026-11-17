import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { LIGHT_COMPONENT_CSS } from "../scripts/light-css.js";
import { LEGACY_PSEUDO_ELEMENTS, closing, splitTopLevel, weight } from "./fixtures/specificity.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const GROUPING = /^@(media|supports|container|layer|starting-style|scope)\b/;

function selectorsIn(code, out = []) {
  let start = 0;
  for (let i = 0; i < code.length; i++) {
    if (code[i] === ";" || code[i] === "}") start = i + 1;
    else if (code[i] === "{") {
      const end = closing(code, i, "{", "}");
      const prelude = code.slice(start, i).trim();
      if (!prelude.startsWith("@")) out.push(...splitTopLevel(prelude));
      if (!prelude.startsWith("@") || GROUPING.test(prelude)) selectorsIn(code.slice(i + 1, end), out);
      i = end;
      start = end + 1;
    }
  }
  return out;
}

function isOuterBox(selector) {
  const weightless = /^:where\((.*)\)$/.exec(selector);
  if (weightless && closing(selector, ":where".length, "(", ")") === selector.length - 1) return isOuterBox(weightless[1]);
  const tag = /^neuwo-[\w-]+/.exec(selector);
  if (!tag) return false;
  let i = tag[0].length;
  while (i < selector.length) {
    if (selector[i] === "[") i = closing(selector, i, "[", "]") + 1;
    else if (selector[i] === ":" && selector[i + 1] !== ":") {
      const [part, name] = /^:([\w-]+)/.exec(selector.slice(i));
      if (LEGACY_PSEUDO_ELEMENTS.has(name)) return false;
      i += part.length;
      if (selector[i] === "(") i = closing(selector, i, "(", ")") + 1;
    } else return false;
  }
  return true;
}

const outweighs = (selector) => weight(selector)[0] > 0 || weight(selector)[1] > 0;

describe("light recipes", () => {
  it("reads selectors inside grouping at-rules, nested ones included, and skips keyframe and at-rule preludes", () => {
    const css = "@property --neuwo-x { syntax: '<angle>'; } @keyframes neuwo-k { from { opacity: 0; } 50% { opacity: 1; } } .a, b { color: red; } @media (hover: hover) { .c:hover { color: blue; } }";
    expect(selectorsIn(css)).toEqual([".a", "b", ".c:hover"]);
    expect(selectorsIn("@media (hover: hover) { @supports (display: grid) { .d { color: red; } } }")).toEqual([".d"]);
    expect(selectorsIn("@starting-style { .e { opacity: 0; } } @scope (.f) { .g { color: red; } }")).toEqual([".e", ".g"]);
  });

  it("weighs the legacy single-colon pseudo-elements as pseudo-elements, not classes", () => {
    for (const name of ["before", "after", "first-line", "first-letter"]) {
      expect(outweighs(`span:${name}`), `span:${name}`).toBe(false);
      expect(outweighs(`.a:${name}`), `.a:${name}`).toBe(true);
    }
  });

  it("allows only a bare neuwo- tag, with attribute or pseudo-class parts, as an outer-box rule, weightless in :where() too", () => {
    for (const selector of ["neuwo-cta", "neuwo-cta:not([hidden])", "neuwo-button[block]:not([hidden])", ":where(neuwo-logo:not([hidden]))"]) {
      expect(isOuterBox(selector), selector).toBe(true);
    }
    for (const selector of ["neuwo-cta span", "neuwo-cta > a", "neuwo-cta::before", "neuwo-cta:before", "neuwo-cta:first-letter", "span", ":where(.neuwo-x)", ":where(neuwo-cta span)", ":where(neuwo-cta) span"]) {
      expect(isOuterBox(selector), selector).toBe(false);
    }
  });

  for (const file of LIGHT_COMPONENT_CSS.filter((path) => path !== "src/components/reset.css")) {
    it(`${file} weighs every selector at least one class, outer-box rules aside`, () => {
      const selectors = selectorsIn(readFileSync(join(root, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, ""));
      expect(selectors.length).toBeGreaterThan(0);
      for (const selector of selectors) expect(outweighs(selector) || isOuterBox(selector), selector).toBe(true);
    });
  }
});
