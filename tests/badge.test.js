import { describe, expect, it } from "vitest";
import "../src/components/badge/neuwo-badge.js";

function make(html) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.firstElementChild;
}

describe("<neuwo-badge>", () => {
  it("registers and renders a .badge pill that projects its label", () => {
    const el = make(`<neuwo-badge>For Publishers</neuwo-badge>`);
    expect(customElements.get("neuwo-badge")).toBeTruthy();
    const badge = el.shadowRoot.querySelector(".badge");
    expect(badge).toBeTruthy();
    expect(badge.getAttribute("part")).toBe("badge");
    expect(badge.querySelector("slot")).toBeTruthy();
  });

  it("is blue by default and green via the variant", () => {
    const base = make(`<neuwo-badge>x</neuwo-badge>`);
    expect(base.shadowRoot.querySelector(".badge").classList.contains("badge--green")).toBe(false);
    const green = make(`<neuwo-badge variant="green">x</neuwo-badge>`);
    expect(green.shadowRoot.querySelector(".badge").classList.contains("badge--green")).toBe(true);
  });

  it("treats an unknown variant as the blue default", () => {
    const el = make(`<neuwo-badge variant="xyz">x</neuwo-badge>`);
    expect(el.shadowRoot.querySelector(".badge").classList.contains("badge--green")).toBe(false);
  });

  it("reflects the variant property to the attribute and re-renders", () => {
    const el = make(`<neuwo-badge>x</neuwo-badge>`);
    el.variant = "green";
    expect(el.getAttribute("variant")).toBe("green");
    expect(el.shadowRoot.querySelector(".badge").classList.contains("badge--green")).toBe(true);
    el.variant = "";
    expect(el.hasAttribute("variant")).toBe(false);
    expect(el.shadowRoot.querySelector(".badge").classList.contains("badge--green")).toBe(false);
  });

  it("drops the border via the borderless axis", () => {
    expect(make(`<neuwo-badge>x</neuwo-badge>`).shadowRoot.querySelector(".badge").classList.contains("badge--borderless")).toBe(false);
    const el = make(`<neuwo-badge borderless>x</neuwo-badge>`);
    expect(el.shadowRoot.querySelector(".badge").classList.contains("badge--borderless")).toBe(true);
    el.borderless = false;
    expect(el.shadowRoot.querySelector(".badge").classList.contains("badge--borderless")).toBe(false);
  });

  it("adds the pulse ring and toggles it from the property", () => {
    const el = make(`<neuwo-badge pulse>x</neuwo-badge>`);
    expect(el.shadowRoot.querySelector(".badge").classList.contains("badge--pulse")).toBe(true);
    el.pulse = false;
    expect(el.shadowRoot.querySelector(".badge").classList.contains("badge--pulse")).toBe(false);
  });

  it("mixes the three axes freely (the live badge: green + borderless + pulse)", () => {
    const el = make(`<neuwo-badge variant="green" borderless pulse>Live</neuwo-badge>`);
    const c = el.shadowRoot.querySelector(".badge").classList;
    expect(c.contains("badge--green")).toBe(true);
    expect(c.contains("badge--borderless")).toBe(true);
    expect(c.contains("badge--pulse")).toBe(true);
  });
});
