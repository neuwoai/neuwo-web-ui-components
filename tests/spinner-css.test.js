import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(__dirname, "../src/components/spinner/spinner.css"), "utf8");

/** @param {string} selector */
function rule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(new RegExp(`(?:^|\\n)${escaped} \\{([^}]*)\\}`))?.[1] ?? "";
}

describe("spinner.css recipe", () => {
  it("makes the host no box, with a bare element rule the reset's [hidden] outweighs", () => {
    expect(rule("neuwo-spinner").trim()).toBe("display: contents;");
  });

  it("hides a hand-written ring on the hidden attribute, which its own display would otherwise outrank", () => {
    expect(rule(".neuwo-spinner[hidden]").trim()).toBe("display: none;");
  });

  it("draws the ring on the class alone, so hand-written markup needs no element", () => {
    const ring = rule(".neuwo-spinner");
    expect(ring).toContain("display: inline-block;");
    expect(ring).toContain("inline-size: 1em;");
    expect(ring).toContain("block-size: 1em;");
    expect(ring).toContain("box-sizing: border-box;");
  });

  it("strokes the ring from currentColor at max(2px, 0.08em), with the track at 35% in a line of its own", () => {
    const ring = rule(".neuwo-spinner");
    const stroke = ring.indexOf("border: max(2px, 0.08em) solid transparent;");
    const track = ring.indexOf("border-color: color-mix(in srgb, currentColor 35%, transparent);");
    const arc = ring.indexOf("border-block-start-color: currentColor;");
    expect(stroke).toBeGreaterThan(-1);
    expect(track).toBeGreaterThan(stroke);
    expect(arc).toBeGreaterThan(track);
    expect(ring).toContain("border-radius: var(--neuwo-radius-full);");
  });

  it("sizes m and l by font size, so the stroke follows", () => {
    expect(rule(".neuwo-spinner--m").trim()).toBe("font-size: 1.5rem;");
    expect(rule(".neuwo-spinner--l").trim()).toBe("font-size: 2.5rem;");
  });

  it("colours blue and green from the brand tokens", () => {
    expect(rule(".neuwo-spinner--blue").trim()).toBe("color: var(--neuwo-color-blue);");
    expect(rule(".neuwo-spinner--green").trim()).toBe("color: var(--neuwo-color-green);");
  });

  it("turns at 0.6s, and fades instead under reduced motion", () => {
    expect(rule(".neuwo-spinner")).toContain("animation: neuwo-spinner-spin 0.6s linear infinite;");
    expect(css).toContain("@keyframes neuwo-spinner-spin");
    expect(css).toContain("@keyframes neuwo-spinner-fade");
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.neuwo-spinner \{\s*animation: neuwo-spinner-fade [^;]*ease-in-out infinite;/);
  });

  it("uses no raw colour literals", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
