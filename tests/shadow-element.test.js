import { describe, expect, it } from "vitest";
import { NeuwoShadowElement } from "../src/core/shadow-element.js";
import { sheet } from "../src/core/sheet.js";

class TestEl extends NeuwoShadowElement {
  render() {
    this.shadowRoot.innerHTML = `<span>x</span>`;
  }
}
customElements.define("test-el", TestEl);

const sheetA = sheet(".a { color: red }");
const sheetB = sheet(".b { color: blue }");

class MultiSheetEl extends NeuwoShadowElement {
  static styles = [sheetA, sheetB];
  render() {
    this.shadowRoot.innerHTML = `<span>multi</span>`;
  }
}
customElements.define("multi-sheet-el", MultiSheetEl);

describe("NeuwoShadowElement", () => {
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

  it("leaves the document's adopted sheets alone", () => {
    const before = document.adoptedStyleSheets.length;
    document.body.appendChild(document.createElement("test-el"));
    expect(document.adoptedStyleSheets.length).toBe(before);
  });

  it("adopts every sheet when static styles is an array", () => {
    const el = document.createElement("multi-sheet-el");
    document.body.appendChild(el);
    expect(el.shadowRoot.adoptedStyleSheets).toContain(sheetA);
    expect(el.shadowRoot.adoptedStyleSheets).toContain(sheetB);
    // reset + both component sheets
    expect(el.shadowRoot.adoptedStyleSheets.length).toBe(3);
  });
});
