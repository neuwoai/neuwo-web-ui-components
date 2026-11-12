import { closing, splitTopLevel } from "./specificity.js";

const GROUPING = /^@(media|supports|container|layer|starting-style|scope)\b/;

/** @typedef {{ selectors: string[], declarations: Map<string, string> }} Rule */

/**
 * @param {string[]} parts
 * @returns {Map<string, string>}
 */
const declarationsOf = (parts) =>
  new Map(
    parts
      .map((declaration) => declaration.split(":").map((part) => part.trim()))
      .filter(([property]) => property)
      .map(([property, ...value]) => [property, value.join(":")]),
  );

/**
 * @param {string} prelude
 * @param {string[] | null} parents
 * @returns {string[]}
 */
function resolve(prelude, parents) {
  const selectors = splitTopLevel(prelude).map((selector) => selector.replace(/\s+/g, " "));
  if (!parents) return selectors;
  return parents.flatMap((parent) => selectors.map((selector) => (selector.includes("&") ? selector.replaceAll("&", parent) : `${parent} ${selector}`)));
}

/**
 * @param {string} code
 * @param {string[] | null} parents
 * @param {Rule[]} rules
 */
function walk(code, parents, rules) {
  const own = [];
  /** @type {[string, string][]} */
  const nested = [];
  let start = 0;
  for (let i = 0; i < code.length; i++) {
    if (code[i] === ";") {
      own.push(code.slice(start, i));
      start = i + 1;
    } else if (code[i] === "{") {
      const end = closing(code, i, "{", "}");
      nested.push([code.slice(start, i).trim(), code.slice(i + 1, end)]);
      i = end;
      start = end + 1;
    }
  }
  own.push(code.slice(start));
  if (parents) rules.push({ selectors: parents, declarations: declarationsOf(own) });
  for (const [prelude, body] of nested) {
    if (!prelude.startsWith("@")) walk(body, resolve(prelude, parents), rules);
    else if (GROUPING.test(prelude)) walk(body, parents, rules);
  }
}

/**
 * @param {string} source
 * @returns {Rule[]}
 */
export function flatRules(source) {
  /** @type {Rule[]} */
  const rules = [];
  walk(source.replace(/\/\*[\s\S]*?\*\//g, ""), null, rules);
  return rules;
}
