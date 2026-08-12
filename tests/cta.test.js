import { describe, expect, it, vi } from "vitest";
import "../src/components/cta/neuwo-cta.js";

function make(html) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.firstElementChild;
}

// A complete CTA (headline + button) so the content guard stays quiet.
const FULL = (attrs = "") =>
  `<neuwo-cta ${attrs}>Ready to <span data-accent>go</span>?` +
  `<span slot="sub">Sub line.</span>` +
  `<neuwo-button slot="actions" variant="solid">Get Started</neuwo-button></neuwo-cta>`;

describe("<neuwo-cta>", () => {
  it("registers and renders the banner variant by default", () => {
    const el = make(FULL());
    expect(customElements.get("neuwo-cta")).toBeTruthy();
    const cta = el.shadowRoot.querySelector(".cta");
    expect(cta.getAttribute("part")).toBe("cta");
    expect(cta.classList.contains("cta--banner")).toBe(true);
    expect(el.shadowRoot.querySelector(".cta__body")).toBeTruthy();
    expect(el.shadowRoot.querySelector(".cta__glow")).toBeNull();
  });

  it("exposes the headline, sub and actions slots and parts", () => {
    const root = make(FULL()).shadowRoot;
    expect([...root.querySelectorAll("slot")].some((s) => !s.name)).toBe(true);
    expect(root.querySelector('slot[name="sub"]')).toBeTruthy();
    expect(root.querySelector('slot[name="actions"]')).toBeTruthy();
    for (const p of ["headline", "sub", "actions"])
      expect(root.querySelector(`[part="${p}"]`)).toBeTruthy();
  });

  it("renders the spotlight variant with the glow + inner layers", () => {
    const root = make(FULL('variant="spotlight"')).shadowRoot;
    expect(root.querySelector(".cta").classList.contains("cta--spotlight")).toBe(true);
    expect(root.querySelector(".cta__glow")).toBeTruthy();
    expect(root.querySelector('[part="inner"]')).toBeTruthy();
    expect(root.querySelector(".cta__body")).toBeNull();
  });

  it("reflects the variant property to the attribute and re-renders", () => {
    const el = make(FULL());
    el.variant = "spotlight";
    expect(el.getAttribute("variant")).toBe("spotlight");
    expect(el.shadowRoot.querySelector(".cta").classList.contains("cta--spotlight")).toBe(true);
    el.variant = "";
    expect(el.hasAttribute("variant")).toBe(false);
    expect(el.shadowRoot.querySelector(".cta").classList.contains("cta--banner")).toBe(true);
  });

  it("reflects the pulse property to the attribute", () => {
    const el = make(FULL());
    el.pulse = true;
    expect(el.hasAttribute("pulse")).toBe(true);
    el.pulse = false;
    expect(el.hasAttribute("pulse")).toBe(false);
  });

  it("reflects the intensity property to the attribute and defaults to m", () => {
    const el = make(FULL("pulse"));
    expect(el.intensity).toBe("m");
    el.intensity = "l";
    expect(el.getAttribute("intensity")).toBe("l");
    el.intensity = "";
    expect(el.hasAttribute("intensity")).toBe(false);
    expect(el.intensity).toBe("m");
  });

  it("warns when the actions slot has no button", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    make(`<neuwo-cta>Ready?</neuwo-cta>`);
    await Promise.resolve();
    expect(warn.mock.calls.flat().join(" ")).toContain("actions");
    warn.mockRestore();
  });

  it("does not warn for a complete CTA", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    make(FULL());
    await Promise.resolve();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("renders the headline as an h2 by default and honours heading-level", () => {
    expect(make(FULL()).shadowRoot.querySelector(".cta__headline").tagName).toBe("H2");
    expect(make(FULL('heading-level="3"')).shadowRoot.querySelector(".cta__headline").tagName).toBe("H3");
  });

  it("clamps an out-of-range or non-numeric heading-level back to h2", () => {
    expect(make(FULL('heading-level="9"')).shadowRoot.querySelector(".cta__headline").tagName).toBe("H2");
    expect(make(FULL('heading-level="0"')).shadowRoot.querySelector(".cta__headline").tagName).toBe("H2");
    expect(make(FULL('heading-level="foo"')).shadowRoot.querySelector(".cta__headline").tagName).toBe("H2");
  });

  it("reflects the headingLevel property to the attribute", () => {
    const el = make(FULL());
    expect(el.headingLevel).toBe("2");
    el.headingLevel = "4";
    expect(el.getAttribute("heading-level")).toBe("4");
    expect(el.shadowRoot.querySelector(".cta__headline").tagName).toBe("H4");
    el.headingLevel = "";
    expect(el.hasAttribute("heading-level")).toBe(false);
  });
});
