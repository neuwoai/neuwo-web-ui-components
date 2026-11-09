import { beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fontsCss = readFileSync(join(__dirname, "../src/foundation/fonts.css"), "utf8");
const fontsJs = readFileSync(join(__dirname, "../src/core/fonts.js"), "utf8");
const fontFiles = [...new Set([...fontsCss.matchAll(/url\(['"]?([^'")]+\.woff2)['"]?\)/g)].map((m) => m[1]))];

describe("font URLs", () => {
  it("finds the woff2 files fonts.css declares", () => {
    expect(fontFiles).toEqual([
      "fonts/outfit-variable.woff2",
      "fonts/noto-sans-variable.woff2",
      "fonts/noto-sans-italic-variable.woff2",
    ]);
  });

  it("names each file as a literal URL a bundler can rewrite", () => {
    for (const rel of fontFiles) {
      expect(fontsJs).toContain(`"${rel}": new URL("./${rel}", import.meta.url).href`);
    }
  });

  it("ships each file the stylesheet points at", () => {
    for (const rel of fontFiles) {
      expect(existsSync(join(__dirname, "../src/foundation", rel))).toBe(true);
    }
  });
});

describe("injectFonts", () => {
  beforeEach(() => {
    document.head.replaceChildren();
    vi.resetModules();
  });

  it("adds one font stylesheet to the head, however often it is called", async () => {
    const { injectFonts } = await import("../src/core/fonts.js");
    injectFonts();
    injectFonts();
    expect(document.head.querySelectorAll("style[data-neuwo-fonts]")).toHaveLength(1);
  });

  it("leaves fonts the page already declared alone", async () => {
    const own = document.createElement("style");
    own.setAttribute("data-neuwo-fonts", "");
    document.head.append(own);
    const { injectFonts } = await import("../src/core/fonts.js");
    injectFonts();
    const styles = document.head.querySelectorAll("style[data-neuwo-fonts]");
    expect(styles).toHaveLength(1);
    expect(styles[0]).toBe(own);
  });
});
