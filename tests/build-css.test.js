import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dist = join(dirname(fileURLToPath(import.meta.url)), "../dist");
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
});
