import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";
import { LIGHT_COMPONENT_CSS } from "../scripts/light-css.js";

const src = join(dirname(fileURLToPath(import.meta.url)), "../src");
const allCss = readdirSync(src, { recursive: true }).filter((file) => file.endsWith(".css"));
const LIGHT_CSS = LIGHT_COMPONENT_CSS.map((file) => relative("src", file));
const read = (file) => readFileSync(join(src, file), "utf8");

describe("custom property naming", () => {
  it("declares every custom property with exactly one neuwo- prefix", () => {
    expect(allCss.length).toBeGreaterThan(0);
    for (const file of allCss) {
      for (const [, name] of read(file).matchAll(/(?<![\w-])--([a-z0-9-]+)\s*:/g)) {
        expect(name, `${file}: --${name}`).toMatch(/^neuwo-(?!neuwo-)/);
      }
    }
  });

  it("prefixes every class in the foundation sheets", () => {
    const sheets = allCss.filter((file) => file.startsWith("foundation"));
    expect(sheets.length).toBeGreaterThan(0);
    for (const file of sheets) {
      const code = read(file).replace(/\/\*[\s\S]*?\*\//g, "").replace(/url\([^)]*\)/g, "");
      for (const [, name] of code.matchAll(/\.([a-zA-Z_][\w-]*)/g)) {
        expect(name, `${file}: .${name}`).toMatch(/^neuwo-(?!neuwo-)/);
      }
    }
  });
});

describe("light DOM recipes", () => {
  it("avoid shadow-only selectors and prefix every class and keyframe", () => {
    for (const file of LIGHT_CSS) {
      const code = read(file).replace(/\/\*[\s\S]*?\*\//g, "").replace(/url\([^)]*\)/g, "");
      expect(code, file).not.toMatch(/:host|::part|::slotted/);
      for (const [, name] of code.matchAll(/\.([a-zA-Z_][\w-]*)/g)) {
        expect(name, `${file}: .${name}`).toMatch(/^neuwo-(?!neuwo-)/);
      }
      for (const [, name] of code.matchAll(/@keyframes\s+([\w-]+)/g)) {
        expect(name, `${file}: @keyframes ${name}`).toMatch(/^neuwo-(?!neuwo-)/);
      }
    }
  });
});
