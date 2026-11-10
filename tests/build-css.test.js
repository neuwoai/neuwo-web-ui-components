import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, posix } from "node:path";
import { LIGHT_COMPONENT_CSS } from "../scripts/light-css.js";
import { templates } from "../src/templates.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const components = join(dist, "neuwo-components.css");

const COMPONENTS = "src/components";
const folders = readdirSync(join(root, COMPONENTS), { recursive: true })
  .map((path) => posix.join(COMPONENTS, path))
  .filter((path) => statSync(join(root, path)).isDirectory());
const cssIn = (folder) =>
  readdirSync(join(root, folder))
    .filter((file) => file.endsWith(".css"))
    .map((file) => posix.join(folder, file));

function recipesOf(tag) {
  const name = tag.replace(/^neuwo-/, "");
  const found = folders.filter((folder) => posix.basename(folder) === name);
  expect(found, tag).toHaveLength(1);
  const parent = posix.dirname(found[0]);
  return [...(parent === COMPONENTS ? [] : cssIn(parent)), ...cssIn(found[0])];
}

describe("combined stylesheets", () => {
  it.runIf(existsSync(components))("opens the components sheet with the marker", () => {
    expect(readFileSync(components, "utf8").trimStart()).toMatch(/^(\/\*[\s\S]*?\*\/\s*)?:root \{ --neuwo-components: 1; \}/);
  });

  it.runIf(existsSync(components))("declares the font faces before the first token", () => {
    const css = readFileSync(components, "utf8");
    expect(css.indexOf("@font-face")).toBeGreaterThan(-1);
    expect(css.indexOf("@font-face")).toBeLessThan(css.indexOf("--neuwo-color"));
  });

  it.runIf(existsSync(components))("publishes fonts.css with urls relative to its folder", () => {
    const css = readFileSync(join(dist, "foundation/fonts.css"), "utf8");
    expect(css).toContain("url('../fonts/");
    expect(css).not.toContain("url('fonts/");
  });

  it.runIf(existsSync(components))("keeps bare element rules out of the components sheet", () => {
    const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
    const bare = /(^|[},])\s*(h1|p|a)\s*[{,:]/m;
    expect(strip(readFileSync(components, "utf8"))).not.toMatch(bare);
    const full = readFileSync(join(dist, "neuwo.css"), "utf8");
    expect(full).toMatch(/(^|[},\s])h1\b[^{]*\{/);
    expect(full.startsWith(readFileSync(components, "utf8"))).toBe(true);
  });

  it("composes the reset first, then the recipes of every registered template and nothing else", () => {
    const recipes = new Set(Object.keys(templates).flatMap(recipesOf));
    expect(LIGHT_COMPONENT_CSS[0]).toBe("src/components/reset.css");
    expect(LIGHT_COMPONENT_CSS.slice(1).sort()).toEqual([...recipes].sort());
    for (const file of LIGHT_COMPONENT_CSS) expect(existsSync(join(root, file)), file).toBe(true);
  });

  it("puts each shared parent recipe before the recipes below it", () => {
    for (const [index, file] of LIGHT_COMPONENT_CSS.entries()) {
      const folder = posix.dirname(file);
      if (folder === COMPONENTS) continue;
      for (const [other, below] of LIGHT_COMPONENT_CSS.entries()) {
        if (posix.dirname(below).startsWith(`${folder}/`)) expect(index, `${file} before ${below}`).toBeLessThan(other);
      }
    }
  });
});
