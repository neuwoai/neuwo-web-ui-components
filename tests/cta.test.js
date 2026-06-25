import { describe, expect, it } from "vitest";
import "../src/components/cta/neuwo-cta.js";

function make(html) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.firstElementChild;
}

describe("<neuwo-cta>", () => {
  it("registers and renders the banner variant by default", () => {
    const el = make(`<neuwo-cta>Ready?</neuwo-cta>`);
    expect(customElements.get("neuwo-cta")).toBeTruthy();
    const cta = el.shadowRoot.querySelector(".cta");
    expect(cta.getAttribute("part")).toBe("cta");
    expect(cta.classList.contains("cta--banner")).toBe(true);
    expect(el.shadowRoot.querySelector(".cta__body")).toBeTruthy();
    expect(el.shadowRoot.querySelector(".cta__glow")).toBeNull();
  });

  it("exposes the headline, sub and actions slots and parts", () => {
    const el = make(`<neuwo-cta>Ready?</neuwo-cta>`);
    const root = el.shadowRoot;
    // default slot for the headline (unnamed), plus the two named slots
    expect([...root.querySelectorAll("slot")].some((s) => !s.name)).toBe(true);
    expect(root.querySelector('slot[name="sub"]')).toBeTruthy();
    expect(root.querySelector('slot[name="actions"]')).toBeTruthy();
    for (const p of ["headline", "sub", "actions"])
      expect(root.querySelector(`[part="${p}"]`)).toBeTruthy();
  });

  it("renders the spotlight variant with the glow + inner layers", () => {
    const el = make(`<neuwo-cta variant="spotlight">Ready?</neuwo-cta>`);
    const root = el.shadowRoot;
    expect(root.querySelector(".cta").classList.contains("cta--spotlight")).toBe(true);
    expect(root.querySelector(".cta__glow")).toBeTruthy();
    expect(root.querySelector('[part="inner"]')).toBeTruthy();
    expect(root.querySelector(".cta__body")).toBeNull();
  });

  it("reflects the variant property to the attribute and re-renders", () => {
    const el = make(`<neuwo-cta>x</neuwo-cta>`);
    el.variant = "spotlight";
    expect(el.getAttribute("variant")).toBe("spotlight");
    expect(el.shadowRoot.querySelector(".cta").classList.contains("cta--spotlight")).toBe(true);
    el.variant = "";
    expect(el.hasAttribute("variant")).toBe(false);
    expect(el.shadowRoot.querySelector(".cta").classList.contains("cta--banner")).toBe(true);
  });
});
