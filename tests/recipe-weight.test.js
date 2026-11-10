import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { LIGHT_COMPONENT_CSS } from "../scripts/light-css.js";
import { closing, splitTopLevel, weight } from "./fixtures/specificity.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const GROUPING = /^@(media|supports|container|layer)\b/;

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
  const name = /^neuwo-[\w-]+/.exec(selector);
  if (!name) return false;
  let i = name[0].length;
  while (i < selector.length) {
    if (selector[i] === "[") i = closing(selector, i, "[", "]") + 1;
    else if (selector[i] === ":" && selector[i + 1] !== ":") {
      i += /^:[\w-]+/.exec(selector.slice(i))[0].length;
      if (selector[i] === "(") i = closing(selector, i, "(", ")") + 1;
    } else return false;
  }
  return true;
}

const outweighs = (selector) => weight(selector)[0] > 0 || weight(selector)[1] > 0;

describe("light recipes", () => {
  it("reads selectors inside @media and skips keyframe and at-rule preludes", () => {
    const css = "@property --neuwo-x { syntax: '<angle>'; } @keyframes neuwo-k { from { opacity: 0; } 50% { opacity: 1; } } .a, b { color: red; } @media (hover: hover) { .c:hover { color: blue; } }";
    expect(selectorsIn(css)).toEqual([".a", "b", ".c:hover"]);
  });

  it("allows only a bare neuwo- tag, with attribute or pseudo-class parts, as an outer-box rule", () => {
    for (const selector of ["neuwo-cta", "neuwo-cta:not([hidden])", "neuwo-button[block]:not([hidden])"]) expect(isOuterBox(selector), selector).toBe(true);
    for (const selector of ["neuwo-cta span", "neuwo-cta > a", "neuwo-cta::before", "span", ":where(.neuwo-x)"]) expect(isOuterBox(selector), selector).toBe(false);
  });

  for (const file of LIGHT_COMPONENT_CSS.filter((path) => path !== "src/components/reset.css")) {
    it(`${file} weighs every selector at least one class, outer-box rules aside`, () => {
      const selectors = selectorsIn(readFileSync(join(root, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, ""));
      expect(selectors.length).toBeGreaterThan(0);
      for (const selector of selectors) expect(outweighs(selector) || isOuterBox(selector), selector).toBe(true);
    });
  }
});
