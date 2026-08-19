import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(
  join(__dirname, "../src/components/cta/cta.css"),
  "utf8"
);

describe("cta.css recipe", () => {
  it("styles both variants from tokens on the branded surface", () => {
    expect(css).toContain(".cta--banner");
    expect(css).toContain(".cta--spotlight");
    expect(css).toContain("var(--color-surface-solid)");
    expect(css).toContain("var(--radius-lg)");
    expect(css).toContain("var(--radius-2xl)");
  });

  it("paints the headline accent with the brand gradient", () => {
    expect(css).toContain("::slotted([data-accent])");
    expect(css).toContain("var(--gradient-accent)");
    expect(css).toContain("background-clip: text");
  });

  it("inlines the shimmer and the conic-border spin, reduced-motion-gated", () => {
    expect(css).toContain("@keyframes cta-scan");
    expect(css).toContain("@keyframes cta-spin");
    expect(css).toContain("var(--cta-angle)");
    expect(css).toContain("conic-gradient");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });

  it("stops the idle shimmer and pulse on hover", () => {
    expect(css).toContain(".cta--banner:hover::after");
    expect(css).toContain(":host([pulse]:hover) ::slotted(neuwo-button");
    expect(css).toContain(".cta--spotlight:hover .cta__inner::before");
  });

  // A tap leaves the element in :hover with nothing to take it out again. For a
  // colour that is invisible; for a rule that starts or stops an animation it
  // sticks for the life of the page, so every one of those is guarded.
  it("guards every hover rule that starts or stops an animation", () => {
    const guarded = [...css.matchAll(/@media \(hover: hover\) \{[\s\S]*?\n\}/g)].map((m) => m[0]);
    const animating = [
      ":host([pulse]:hover) ::slotted(neuwo-button:first-of-type)",
      ".cta--banner:hover::after",
      ".cta--spotlight:hover {",
      ".cta--spotlight:hover .cta__glow",
      ".cta--spotlight:hover .cta__inner::before",
    ];
    for (const selector of animating) {
      expect(guarded.some((block) => block.includes(selector))).toBe(true);
    }
  });

  // Guarding these too would risk losing them wholesale in any environment that
  // misreports `hover: none`, and a stuck shadow costs nothing.
  it("leaves the plain colour and shadow hovers unguarded", () => {
    const outside = css.replace(/@media \(hover: hover\) \{[\s\S]*?\n\}/g, "");
    expect(outside).toMatch(/\.cta--banner:hover \{[^}]*box-shadow/);
  });

  it("adds the synchronised button-pulse ring, reduced-motion-gated", () => {
    expect(css).toContain(":host([pulse]) ::slotted(neuwo-button:first-of-type)");
    expect(css).toContain("@keyframes cta-button-pulse");
  });

  it("scales the ring from the intensity axis without a second keyframe block", () => {
    expect(css).toContain(':host([pulse][intensity="s"])');
    expect(css).toContain(':host([pulse][intensity="l"])');
    expect(css).toContain("var(--cta-pulse-spread)");
    expect(css).toContain("var(--cta-pulse-alpha)");
    expect(css.match(/@keyframes cta-button-pulse/g)).toHaveLength(1);
  });

  it("rings the first action button whatever its variant", () => {
    // A variant filter would silently drop the ring for an outline primary and
    // force the consumer to slot a solid button and repaint it via ::part.
    expect(css).not.toContain('neuwo-button[variant=');
  });

  it("caps the slotted field with a knob it never declares", () => {
    // Declaring the default on the element would beat the value a consumer
    // inherits in from :root or the host, which is the only way it gets set.
    expect(css).toContain("max-width: var(--cta-field-width, 24rem)");
    expect(css).not.toMatch(/--cta-field-width:/);
    expect(css).toMatch(/\.cta__field--empty\s*\{\s*display:\s*none/);
    expect(css).toMatch(/@media \(max-width: 40rem\)[\s\S]*\.cta__field[^}]*margin-inline: auto/);
  });

  it("tokenises the three status states and costs no space when empty", () => {
    expect(css).toMatch(/\.cta__status\s*\{[^}]*color:\s*var\(--color-grey-400\)/);
    expect(css).toMatch(/\.cta__status--success\s*\{[^}]*color:\s*var\(--color-green\)/);
    expect(css).toMatch(/\.cta__status--error\s*\{[^}]*color:\s*var\(--color-red\)/);
    expect(css).toMatch(/\.cta__status:empty\s*\{[^}]*margin-top:\s*0/);
  });

  it("uses no raw colour literals", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/rgba?\(/);
  });
});
