import { describe, expect, it } from "vitest";
import "../src/components/deal-id/neuwo-deal-id.js";

function make(html) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.firstElementChild;
}

describe("<neuwo-deal-id>", () => {
  it("registers and renders a read-only .deal-id box that projects its value", () => {
    const el = make(`<neuwo-deal-id>NW-CA-2026-04-8A3F</neuwo-deal-id>`);
    expect(customElements.get("neuwo-deal-id")).toBeTruthy();
    const box = el.shadowRoot.querySelector(".deal-id");
    expect(box).toBeTruthy();
    expect(box.getAttribute("part")).toBe("value");
    expect(box.querySelector("slot")).toBeTruthy();
    expect(el.textContent).toBe("NW-CA-2026-04-8A3F");
  });

  it("is size m (no modifier class) by default", () => {
    const el = make(`<neuwo-deal-id>NW-1</neuwo-deal-id>`);
    const c = el.shadowRoot.querySelector(".deal-id").classList;
    expect(c.contains("deal-id--s")).toBe(false);
    expect(c.contains("deal-id--l")).toBe(false);
    expect(el.size).toBe("m");
  });

  it("maps size s and l to a modifier class, m / unknown to none, and reflects the property", () => {
    expect(make(`<neuwo-deal-id size="s">NW-1</neuwo-deal-id>`).shadowRoot.querySelector(".deal-id").classList.contains("deal-id--s")).toBe(true);
    expect(make(`<neuwo-deal-id size="l">NW-1</neuwo-deal-id>`).shadowRoot.querySelector(".deal-id").classList.contains("deal-id--l")).toBe(true);
    const unknown = make(`<neuwo-deal-id size="xl">NW-1</neuwo-deal-id>`).shadowRoot.querySelector(".deal-id").classList;
    expect(unknown.contains("deal-id--s")).toBe(false);
    expect(unknown.contains("deal-id--l")).toBe(false);
    const el = make(`<neuwo-deal-id>NW-1</neuwo-deal-id>`);
    el.size = "s";
    expect(el.getAttribute("size")).toBe("s");
    expect(el.shadowRoot.querySelector(".deal-id").classList.contains("deal-id--s")).toBe(true);
    el.size = "";
    expect(el.hasAttribute("size")).toBe(false);
  });
});
