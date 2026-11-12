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
function strayDeclarations(source) {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const stray = [];
  let depth = 0;
  let text = "";
  for (const char of code) {
    if (char === "{") { depth++; text = ""; }
    else if (char === "}") { depth--; text = ""; }
    else if (char === ";" && depth === 0) {
      if (!text.trim().startsWith("@")) stray.push(text.trim());
      text = "";
    } else if (depth === 0) text += char;
  }
  return stray;
}

describe("recipe and foundation sheets", () => {
  it.each(sheets)("has no declaration outside a rule: %s", (_name, file) => {
    expect(strayDeclarations(readFileSync(file, "utf8"))).toEqual([]);
  });

  it("declares the shimmer width on the shimmer rule", () => {
    const rules = flatRules(readFileSync(join(root, "components/badge/badge.css"), "utf8"));
    const shimmer = rules.find((rule) => rule.selectors.includes(".neuwo-badge--shimmer"));
    expect(shimmer?.declarations.get("--neuwo-badge-shimmer-width")).toBe("35");
  });
});
