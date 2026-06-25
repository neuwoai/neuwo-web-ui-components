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
});
