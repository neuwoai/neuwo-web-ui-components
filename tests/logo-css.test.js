import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(__dirname, "../src/components/logo/logo.css"), "utf8");
const LOGOS = join(__dirname, "../src/foundation/logos");

describe("logo.css recipe", () => {
  it("sizes the element's box with no specificity, so a project's single class on the element wins", () => {
    const host = css.match(/^:where\(neuwo-logo:not\(\[hidden\]\)\) \{([^}]*)\}/m)?.[1] ?? "";
    expect(host).toMatch(/display: inline-flex;/);
    expect(host).toMatch(/vertical-align: middle;/);
    expect(host).toMatch(/height: var\(--neuwo-logo-height, 1\.75rem\);/);
    expect(host).toMatch(/aspect-ratio: 32 \/ 5;/);
    expect(host).toMatch(/max-width: 100%;/);
    expect(css).not.toMatch(/^neuwo-logo/m);
    expect(css).not.toContain(":host");
  });

  it("fills the element's box with the drawing, with only the class's weight", () => {
    expect(css).toMatch(/^:where\(neuwo-logo\) > \.neuwo-logo \{\s*width: 100%;\s*height: 100%;\s*\}/m);
    expect(css.indexOf(":where(neuwo-logo) > .neuwo-logo")).toBeGreaterThan(css.indexOf(".neuwo-logo {"));
  });

  it("sizes the portable class by height alone, so an <img> with it keeps the aspect ratio", () => {
    expect(css).toMatch(/\.neuwo-logo \{[^}]*height:\s*var\(--neuwo-logo-height, 1\.75rem\)/);
    expect(css).toMatch(/\.neuwo-logo \{[^}]*width:\s*auto/);
    expect(css).toMatch(/\.neuwo-logo \{[^}]*display:\s*block/);
  });

  it("carries no colour at all, because the ink pair lives in the file", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/^\s*(color|fill|background(-color)?):/m);
  });
});

describe("published logo assets", () => {
  // The brand's own exports, kept byte-identical so a new export can be diffed against them.
  const INK = {
    "bg-light": ["#0AA5C3", "#1E1E0A"],
    "bg-dark": ["white", "#0AA5C3"],
    "bg-dark-alt": ["#0AA5C3", "white"],
    "bg-colour": ["white", "#1E1E0A"],
  };

  it("ships one file per variant, each with its brand ink pair", () => {
    for (const [variant, [lead, trail]] of Object.entries(INK)) {
      const svg = readFileSync(join(LOGOS, `neuwo-logo--${variant}.svg`), "utf8");
      const fills = [...svg.matchAll(/<path [^>]*fill="([^"]+)"/g)].map((m) => m[1]);
      expect(fills).toEqual([lead, lead, lead, trail, trail]);
      expect(svg).toContain('viewBox="0 0 320 50"');
      const [across, down] = (css.match(/aspect-ratio: ([\d.]+) \/ ([\d.]+);/) ?? []).slice(1).map(Number);
      expect(across / down, variant).toBe(320 / 50);
    }
  });
});
