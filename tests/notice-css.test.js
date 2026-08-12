import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(
  join(__dirname, "../src/components/notice/notice.css"),
  "utf8"
);

describe("notice.css recipe", () => {
  it("paints the shared glass surface from tokens on the portable class", () => {
    expect(css).toContain(".notice");
    expect(css).toContain("var(--glass-bg)");
    expect(css).toContain("var(--glass-border)");
    expect(css).toContain("blur(var(--glass-blur))");
    expect(css).toContain("-webkit-backdrop-filter");
    expect(css).toContain("var(--shadow-xl)");
    expect(css).toContain("var(--radius-xl)");
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("reads its width and gutter knobs with a fallback, never declaring them", () => {
    // A declaration on the card would beat the value a consumer inherits in from
    // `:root` or the host, which is the only way either knob gets set.
    expect(css).not.toMatch(/--notice-max-width:/);
    expect(css).not.toMatch(/--notice-gutter:/);
    expect(css).toContain("max-width: var(--notice-max-width, 24rem)");
    // Full width less an equal gutter each side, until the cap takes over.
    expect(css).toContain("width: calc(100% - var(--notice-gutter, var(--space-4)) * 2)");
  });

  it("composes a placement from independent edge modifiers", () => {
    for (const modifier of [".notice--fixed", ".notice--top", ".notice--bottom", ".notice--start", ".notice--end", ".notice--center"])
      expect(css).toContain(modifier);
    // Logical insets, so a right-to-left page docks the card on the other side.
    expect(css).toContain("inset-inline-start: var(--notice-gutter");
    expect(css).toContain("inset-inline-end: var(--notice-gutter");
    expect(css).toContain("var(--z-overlay)");
  });

  it("keeps the entrance off `transform`, which the centred placement owns", () => {
    expect(css).toContain("@keyframes notice-in");
    expect(css).toMatch(/@keyframes notice-in\s*\{[^}]*\{[^}]*translate: 0 var\(--notice-rise\)/);
    expect(css).toMatch(/\.notice--center\s*\{[^}]*transform: translateX\(-50%\)/);
  });

  it("reserves the close button's corner on the card, not on the first line", () => {
    expect(css).toMatch(/\.notice--dismissible\s*\{[^}]*padding-inline-end:\s*calc\(var\(--space-3\) \+ var\(--space-8\)\)/);
    // The cross is a mask over the button's own colour, so hover recolours it.
    expect(css).toMatch(/\.notice__dismiss::before\s*\{[^}]*background: currentColor/);
    expect(css).toContain("-webkit-mask:");
    expect(css).toContain("var(--shadow-focus)");
  });

  it("stacks by default and turns to a row only when there is room", () => {
    expect(css).toMatch(/\.notice\s*\{[^}]*flex-direction: column/);
    expect(css).toMatch(/@media \(min-width: 48rem\)[\s\S]*\.notice--row[^}]*flex-direction: row/);
  });

  it("removes an unfilled slot from the flow", () => {
    for (const empty of [".notice__title--empty", ".notice__message--empty", ".notice__actions--empty"])
      expect(css).toContain(empty);
  });

  it("stills the entrance under reduced motion", () => {
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none/);
  });

  it("keeps every visual value on the portable class, not on :host", () => {
    // The only :host rule is the wrapper's display, which carries no styling.
    expect(css).not.toMatch(/:host\(/);
    expect(css).toMatch(/:host\s*\{\s*display: block;\s*\}/);
  });
});
