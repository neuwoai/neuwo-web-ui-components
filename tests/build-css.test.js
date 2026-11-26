import { beforeAll, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, posix } from "node:path";
import { LIGHT_COMPONENT_CSS } from "../scripts/light-css.js";
import { templates } from "../src/templates.js";
import { distFile } from "./setup/dist.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const components = () => readFileSync(distFile("neuwo-components.css"), "utf8");

const COMPONENTS = "src/components";
const folders = readdirSync(join(root, COMPONENTS), { recursive: true })
  .map((path) => posix.join(COMPONENTS, path))
  .filter((path) => statSync(join(root, path)).isDirectory());
const FOLDERS = { "neuwo-radio-group": "radio", "neuwo-menu-group": "menu", "neuwo-menu-item": "menu" };
const cssIn = (folder) =>
  readdirSync(join(root, folder))
    .filter((file) => file.endsWith(".css"))
    .map((file) => posix.join(folder, file));

function recipesOf(tag) {
  const name = FOLDERS[tag] ?? tag.replace(/^neuwo-/, "");
  const found = folders.filter((folder) => posix.basename(folder) === name);
  expect(found, tag).toHaveLength(1);
  const parent = posix.dirname(found[0]);
  return [...(parent === COMPONENTS ? [] : cssIn(parent)), ...cssIn(found[0])];
}

describe("combined stylesheets", () => {
  it("opens the components sheet with the marker", () => {
    expect(components().trimStart()).toMatch(/^(\/\*[\s\S]*?\*\/\s*)?:root \{ --neuwo-components: 1; \}/);
  });

  it("declares the font faces before the first token", () => {
    const css = components();
    expect(css.indexOf("@font-face")).toBeGreaterThan(-1);
    expect(css.indexOf("@font-face")).toBeLessThan(css.indexOf("--neuwo-color"));
  });

  it("publishes fonts.css with urls relative to its folder", () => {
    const css = readFileSync(distFile("foundation/fonts.css"), "utf8");
    expect(css).toContain("url('../fonts/");
    expect(css).not.toContain("url('fonts/");
  });

  it("keeps bare element rules out of the components sheet", () => {
    const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
    const bare = /(^|[},])\s*(h1|p|a)\s*[{,:]/m;
    expect(strip(components())).not.toMatch(bare);
    const full = readFileSync(distFile("neuwo.css"), "utf8");
    expect(full).toMatch(/(^|[},\s])h1\b[^{]*\{/);
    expect(full.startsWith(components())).toBe(true);
  });

  it("composes the reset, the popup sheet and the navigation sheet first, then the recipes of every registered template and nothing else", () => {
    const recipes = new Set(Object.keys(templates).flatMap(recipesOf));
    expect(LIGHT_COMPONENT_CSS[0]).toBe("src/components/reset.css");
    expect(LIGHT_COMPONENT_CSS[1]).toBe("src/components/popup.css");
    expect(LIGHT_COMPONENT_CSS[2]).toBe("src/foundation/navigation.css");
    expect(LIGHT_COMPONENT_CSS.slice(3).sort()).toEqual([...recipes].sort());
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

describe("browser bundles", () => {
  it("leaves the font faces and the components marker out of the main bundle", () => {
    const js = readFileSync(distFile("neuwo.js"), "utf8");
    expect(js).not.toMatch(/@font-face|\.woff2/);
    expect(js).not.toContain("--neuwo-components");
  });

  describe("the standalone bundle", () => {
    /** @type {string[]} */
    const sheets = [];
    /** @type {number[]} */
    const adoptedAtDefine = [];

    beforeAll(async () => {
      const define = customElements.define.bind(customElements);
      vi.spyOn(customElements, "define").mockImplementation((...args) => {
        adoptedAtDefine.push(document.adoptedStyleSheets.length);
        define(...args);
      });
      vi.spyOn(CSSStyleSheet.prototype, "replaceSync").mockImplementation((text) => void sheets.push(text));
      await import(distFile("neuwo-standalone.js"));
      vi.restoreAllMocks();
    });

    it("embeds the components sheet, its font urls resolved beside the bundle", () => {
      expect(sheets).toHaveLength(1);
      expect(sheets[0]).not.toContain("url('fonts/");
      expect(sheets[0].replace(/url\('[^']*\/dist\/fonts\//g, "url('fonts/")).toBe(components());
    });

    it("adopts the sheet before it defines the first element", () => {
      expect(adoptedAtDefine).toEqual(Object.keys(templates).map(() => 1));
    });
  });
});

describe("bundler build", () => {
  const SPINNER = "neuwo-btn__spinner";
  const ENTRIES = ["neuwo.js", "jsx-runtime.js", "jsx-dev-runtime.js"];
  const IMPORTS = /(?:\bfrom|\bimport)\s*["']\.\.?\/|\bimport\s*\(/;
  const bundler = () => readdirSync(join(root, "dist/bundler")).filter((file) => file.endsWith(".js"));
  const text = (file) => readFileSync(distFile(`bundler/${file}`), "utf8");

  it("keeps the CDN bundles self-contained", () => {
    for (const file of ["neuwo.js", "neuwo-standalone.js"]) {
      expect(readFileSync(distFile(file), "utf8"), file).not.toMatch(IMPORTS);
    }
  });

  it("the self-containment check refuses a relative or dynamic import under any file name, as in the bundler entry", () => {
    const refused = [`import{a as b}from"./templates-Q2.js";`, `import "../shared.js";`, `export*from'./chunk-X.js'`, `await import("./lazy.js")`, `import ( "https://cdn.example/x.js" )`];
    for (const code of refused) expect(code, code).toMatch(IMPORTS);
    expect(text("neuwo.js"), "bundler/neuwo.js").toMatch(IMPORTS);
    for (const code of [`new URL("./fonts/a.woff2", import.meta.url)`, `const from = "./x";`]) expect(code, code).not.toMatch(IMPORTS);
  });

  it("holds the shared template code once in the bundler build", () => {
    const holders = bundler().filter((file) => text(file).includes(SPINNER));
    expect(holders).toHaveLength(1);
    expect(holders[0]).toMatch(/^chunk-/);
    for (const file of ENTRIES) expect(text(file), file).toContain(holders[0]);
  });

  it("builds every target of the package exports", () => {
    const targets = [];
    const collect = (value) => {
      if (typeof value === "string") targets.push(value);
      else for (const inner of Object.values(value)) collect(inner);
    };
    const { exports } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    collect(exports);
    for (const target of targets.filter((path) => !path.includes("*") && path !== "./package.json")) {
      expect(existsSync(join(root, target)), target).toBe(true);
    }
  });
});
