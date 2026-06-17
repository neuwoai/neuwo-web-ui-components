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

  it("adopts the shared reset sheet into the shadow root", () => {
    const el = document.createElement("test-el");
    document.body.appendChild(el);
    expect(el.shadowRoot.adoptedStyleSheets.length).toBeGreaterThanOrEqual(1);
  });

  it("adopts the design tokens onto the document, not the shadow root", () => {
    // Guards the adoption LOCATION; token value resolution is verified on the demo
    // (happy-dom does not parse the full tokens.css).
    const el = document.createElement("test-el");
    document.body.appendChild(el);
    expect(document.adoptedStyleSheets.length).toBeGreaterThanOrEqual(1);
    expect(el.shadowRoot.adoptedStyleSheets).not.toContain(
      document.adoptedStyleSheets[0]
    );
  });
});
