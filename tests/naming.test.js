import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";
import { LIGHT_COMPONENT_CSS } from "../scripts/light-css.js";

const src = join(dirname(fileURLToPath(import.meta.url)), "../src");
const allCss = readdirSync(src, { recursive: true }).filter((file) => file.endsWith(".css"));
const allJs = readdirSync(src, { recursive: true }).filter((file) => file.endsWith(".js"));
const LIGHT_CSS = LIGHT_COMPONENT_CSS.map((file) => relative("src", file));
const read = (file) => readFileSync(join(src, file), "utf8");
const PREFIXED = /^neuwo-(?!neuwo-)/;

const withoutComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/url\([^)]*\)/g, "");
const withoutStringsOrAttributes = (css) => withoutComments(css).replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""').replace(/\[[^\]]*\]/g, "[]");
const classesIn = (css) => [...withoutStringsOrAttributes(css).matchAll(/\.([a-zA-Z_][\w-]*)/g)].map((match) => match[1]);
const readsIn = (css) => [...withoutComments(css).matchAll(/var\(\s*--([\w-]+)/g)].map((match) => match[1]);
const scriptCode = (js) => js.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:\\])\/\/.*$/gm, "$1");
const propertiesNamedIn = (js) => [...scriptCode(js).matchAll(/(?:["'`]|var\(\s*)--([a-zA-Z][\w-]*)/g)].map((match) => match[1]);

describe("naming checks", () => {
  it("find classes in selectors only, not in attribute selectors or strings", () => {
    expect(classesIn(`a[href$=".pdf"]::after { content: "v1.2"; } .neuwo-x, .neuwo-y--z:hover {}`)).toEqual(["neuwo-x", "neuwo-y--z"]);
  });

  it("find the custom properties a script names in strings and var(), not in comments", () => {
    const js = `// "--skip"\nel.style.setProperty("--neuwo-a", x); const s = \`--neuwo-b:\${v}\`; /* '--c' */ el.style.color = "var(--neuwo-d)"; a.includes("--");`;
    expect(propertiesNamedIn(js)).toEqual(["neuwo-a", "neuwo-b", "neuwo-d"]);
  });
});

describe("custom property naming", () => {
  it("declares every custom property with exactly one neuwo- prefix", () => {
    expect(allCss.length).toBeGreaterThan(0);
    for (const file of allCss) {
      for (const [, name] of read(file).matchAll(/(?<![\w-])--([a-z0-9-]+)\s*:/g)) {
        expect(name, `${file}: --${name}`).toMatch(PREFIXED);
      }
    }
  });

  it("reads only prefixed custom properties in the stylesheets", () => {
    const names = allCss.flatMap((file) => readsIn(read(file)).map((name) => [file, name]));
    expect(names.length).toBeGreaterThan(0);
    for (const [file, name] of names) expect(name, `${file}: var(--${name})`).toMatch(PREFIXED);
  });

  it("names only prefixed custom properties in the scripts", () => {
    const names = allJs.flatMap((file) => propertiesNamedIn(read(file)).map((name) => [file, name]));
    expect(names.length).toBeGreaterThan(0);
    for (const [file, name] of names) expect(name, `${file}: --${name}`).toMatch(PREFIXED);
  });

  it("prefixes every class in the foundation sheets", () => {
    const sheets = allCss.filter((file) => file.startsWith("foundation"));
    expect(sheets.length).toBeGreaterThan(0);
    for (const file of sheets) {
      for (const name of classesIn(read(file))) expect(name, `${file}: .${name}`).toMatch(PREFIXED);
    }
  });
});

describe("light DOM recipes", () => {
  it("avoid shadow-only selectors and prefix every class and keyframe", () => {
    for (const file of LIGHT_CSS) {
      const code = withoutComments(read(file));
      expect(code, file).not.toMatch(/:host|::part|::slotted/);
      for (const name of classesIn(code)) expect(name, `${file}: .${name}`).toMatch(PREFIXED);
      for (const [, name] of code.matchAll(/@keyframes\s+([\w-]+)/g)) {
        expect(name, `${file}: @keyframes ${name}`).toMatch(PREFIXED);
      }
    }
  });
});
