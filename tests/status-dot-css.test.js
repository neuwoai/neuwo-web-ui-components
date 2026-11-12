import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(
  join(__dirname, "../src/components/status-dot/status-dot.css"),
  "utf8"
);

describe("status-dot.css recipe", () => {
  it("renders a colour-aware dot and ring from tokens", () => {
    expect(css).toContain(".neuwo-status-dot");
    expect(css).toContain("border-radius: 50%");
    expect(css).toContain("var(--neuwo-color-green)");
    expect(css).toContain(".neuwo-status-dot--blue");
    expect(css).toContain("var(--neuwo-color-blue)");
    expect(css).toContain("currentColor");
  });

  it("inlines both keyframes and gates them on reduced motion", () => {
    expect(css).toContain("@keyframes neuwo-status-dot-pulse");
    expect(css).toContain("@keyframes neuwo-status-dot-blink");
    expect(css).toContain(".neuwo-status-dot--pulse");
    expect(css).toContain(".neuwo-status-dot--blink");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });

  it("uses no raw colour literals", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("defines the halo-intensity presets from currentColor (no raw hex)", () => {
    expect(css).toContain(".neuwo-status-dot--halo-s");
    expect(css).toContain(".neuwo-status-dot--halo-l");
    expect(css).toContain("color-mix(in srgb, currentColor");
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("defines the glow-intensity presets as currentColor drop-shadows that stack over the ring", () => {
    for (const level of ["s", "m", "l"]) expect(css).toContain(`.neuwo-status-dot--glow-${level}`);
    // On `filter`, so it composes with the ring and the halo instead of overriding them.
    expect(css).toMatch(/\.neuwo-status-dot--glow-[sml]\s*{\s*filter: drop-shadow/);
    expect(css).toContain("drop-shadow(0 0 0.5rem currentColor)");
    expect(css).not.toMatch(/\.neuwo-status-dot--glow-[sml][^}]*box-shadow/);
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("styles the outer box from the element name and uses no :host", () => {
    expect(css).not.toContain(":host");
    expect(css).toMatch(/^neuwo-status-dot\s*{[^}]*display: inline-flex/m);
    expect(css).not.toMatch(/(^|[\s,}])\.(badge|deal-id|status-dot)(?![\w-])/);
  });
});
