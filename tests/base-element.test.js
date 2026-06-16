import { describe, expect, it } from "vitest";
import { NeuwoElement } from "../src/core/base-element.js";

class TestEl extends NeuwoElement {
  render() {
    this.shadowRoot.innerHTML = `<span>x</span>`;
  }
}
customElements.define("test-el", TestEl);

describe("NeuwoElement", () => {
  it("attaches an open shadow root and renders on connect", () => {
    const el = document.createElement("test-el");
    document.body.appendChild(el);
    expect(el.shadowRoot).toBeTruthy();
    expect(el.shadowRoot.querySelector("span").textContent).toBe("x");
  });

  it("adopts the shared token and reset sheets", () => {
    const el = document.createElement("test-el");
    document.body.appendChild(el);
    expect(el.shadowRoot.adoptedStyleSheets.length).toBeGreaterThanOrEqual(2);
  });
});
