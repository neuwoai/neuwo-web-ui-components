import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { LIGHT_COMPONENT_CSS } from "../scripts/light-css.js";
import { templates } from "../src/templates.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const components = join(dist, "neuwo-components.css");

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

  it("composes the reset first, then the recipe of every registered template and nothing else", () => {
    const recipes = Object.keys(templates).map((tag) => {
      const name = tag.replace(/^neuwo-/, "");
      return `src/components/${name}/${name}.css`;
    });
    expect(LIGHT_COMPONENT_CSS[0]).toBe("src/components/reset.css");
    expect(LIGHT_COMPONENT_CSS.slice(1).sort()).toEqual(recipes.sort());
    for (const file of LIGHT_COMPONENT_CSS) expect(existsSync(join(root, file)), file).toBe(true);
  });
});
