import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(
  join(__dirname, "../src/components/dropdown/dropdown.css"),
  "utf8"
);

describe("dropdown.css recipe", () => {
  it("keeps :host to layout only", () => {
    // Every :host rule may set display and nothing else: the design system shows
    // the portable class, and class-only consumers never get the shadow rules.
    const hostRules = css.match(/:host[^{]*\{[^}]*\}/g) ?? [];
    expect(hostRules.length).toBeGreaterThan(0);
    for (const rule of hostRules) {
      const body = rule.slice(rule.indexOf("{") + 1, -1);
      const props = body
        .split(";")
        .map((d) => d.split(":")[0].trim())
        .filter(Boolean);
      expect(props).toEqual(props.filter((p) => p === "display"));
    }
  });

  it("puts every visual value on portable BEM classes", () => {
    // `.dropdown--end` is deliberately absent. align="end" is realised by
    // positionPopup writing an inline `right`, because a top-layer popover can
    // only be placed by inline styles. The modifier is still emitted as a state
    // hook for consumers, but it carries no CSS rule of its own.
    for (const cls of [
      ".dropdown",
      ".dropdown__trigger",
      ".dropdown__label",
      ".dropdown__arrow",
      ".dropdown__panel",
      ".dropdown--top",
      ".dropdown--inline",
    ])
      expect(css).toContain(cls);
  });

  it("draws the centre-out underline from tokens on both the trigger and the items", () => {
    expect(css).toContain("--dropdown-underline: 2px");
    expect(css).toContain("linear-gradient(var(--color-blue), var(--color-blue))");
    expect(css).toContain("background-position: center calc(100% - 0.375rem)");
    expect(css).toContain("background-size: 0 var(--dropdown-underline)");
    expect(css).toContain("calc(100% - 2 * var(--space-3))");
    expect(css).toContain("calc(100% - 2 * var(--space-4))");
  });

  it("shows the underline on keyboard focus, not hover alone", () => {
    expect(css).toContain(".dropdown__trigger:focus-visible");
    expect(css).toContain("::slotted(a:focus-visible)");
    expect(css).toContain("var(--shadow-focus)");
  });

  it("gives the panel the same surface as the combobox popup", () => {
    expect(css).toContain("var(--color-surface-solid)");
    expect(css).toContain("var(--glass-border)");
    expect(css).toContain("var(--shadow-xl)");
    expect(css).toContain("var(--radius-lg)");
    expect(css).toContain(".dropdown__panel[hidden]");
  });

  it("strips the panel surface in inline mode", () => {
    expect(css).toContain(".dropdown--inline .dropdown__panel");
  });

  it("marks the selected item from aria-current", () => {
    expect(css).toContain("::slotted([aria-current])");
  });

  it("animates the panel and respects reduced motion", () => {
    expect(css).toContain("@keyframes neuwo-dropdown-in");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });

  it("confines !important to the three properties typography.css also sets", () => {
    // Document rules outrank ::slotted() for normal declarations, so these three
    // must be important or the recipe loses to the library's own typography.css.
    const important = [...css.matchAll(/([a-z-]+)\s*:[^;{}]*!important/g)].map((m) => m[1]);
    expect(important.length).toBeGreaterThan(0);
    expect([...new Set(important)].sort()).toEqual(["color", "text-decoration", "transition"]);
  });

  it("uses tokens only, never a raw colour literal", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
