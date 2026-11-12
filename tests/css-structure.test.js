import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";
import { flatRules } from "./fixtures/css-rules.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../src");
const sheets = ["components", "foundation"].flatMap((folder) =>
  readdirSync(join(root, folder), { recursive: true })
    .filter((file) => String(file).endsWith(".css"))
    .map((file) => [relative(root, join(root, folder, String(file))), join(root, folder, String(file))]),
);

/**
 * @param {string} source
 * @returns {string[]}
 */
function structureErrors(source) {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "));
  const errors = [];
  /** @type {number[]} */
  const open = [];
  let line = 1;
  let text = "";
  for (const char of code) {
    if (char === "\n") line++;
    if (char === "{") {
      open.push(line);
      text = "";
    } else if (char === "}") {
      if (open.pop() === undefined) errors.push(`line ${line}: } closes no rule`);
      text = "";
    } else if (char === ";" && !open.length) {
      if (!text.trim().startsWith("@")) errors.push(`line ${line}: declaration outside a rule: ${text.trim()}`);
      text = "";
    } else if (!open.length) text += char;
  }
  for (const at of open) errors.push(`line ${at}: { is never closed`);
  return errors;
}

describe("the stylesheet structure check", () => {
  it.each([
    ["a stray }", ".a { color: red; } }\n.b { color: blue; }", ["line 1: } closes no rule"]],
    ["an unclosed {", ".a { color: red; }\n.b { color: blue;", ["line 2: { is never closed"]],
    ["a declaration after a stray }", ".a { color: red; }\n}\ncolor: blue;\n.b { color: green; }", ["line 2: } closes no rule", "line 3: declaration outside a rule: color: blue"]],
  ])("fails on %s", (_name, source, errors) => {
    expect(structureErrors(source)).toEqual(errors);
  });
});

describe("recipe and foundation sheets", () => {
  it.each(sheets)("has balanced braces and no declaration outside a rule: %s", (_name, file) => {
    expect(structureErrors(readFileSync(file, "utf8"))).toEqual([]);
  });

  it("declares the shimmer percentage on the shimmer rule", () => {
    const rules = flatRules(readFileSync(join(root, "components/badge/badge.css"), "utf8"));
    const shimmer = rules.find((rule) => rule.selectors.includes(".neuwo-badge--shimmer"));
    expect(shimmer?.declarations.get("--neuwo-badge-shimmer-percent")).toBe("35");
  });
});
