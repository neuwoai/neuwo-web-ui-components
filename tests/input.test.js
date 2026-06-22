import { describe, expect, it } from "vitest";
import "../src/components/fields/input/neuwo-input.js";

function make(html) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.firstElementChild;
}

describe("<neuwo-input>", () => {
  it("renders a text input by default", () => {
    const control = make(`<neuwo-input></neuwo-input>`).shadowRoot.querySelector("input");
    expect(control).toBeTruthy();
    expect(control.type).toBe("text");
  });

  it("maps an allowed type onto the inner input", () => {
    const control = make(`<neuwo-input type="email"></neuwo-input>`).shadowRoot.querySelector("input");
    expect(control.type).toBe("email");
  });

  it("falls back to text for a type outside the allowed set", () => {
    const control = make(`<neuwo-input type="checkbox"></neuwo-input>`).shadowRoot.querySelector("input");
    expect(control.type).toBe("text");
  });

  it("forwards validation attributes to the inner input", () => {
    const control = make(
      `<neuwo-input type="number" min="0" max="10" step="2"></neuwo-input>`
    ).shadowRoot.querySelector("input");
    expect(control.getAttribute("min")).toBe("0");
    expect(control.getAttribute("max")).toBe("10");
    expect(control.getAttribute("step")).toBe("2");
  });

  it("is a form-associated element", () => {
    const el = make(`<neuwo-input></neuwo-input>`);
    expect(el.constructor.formAssociated).toBe(true);
  });
});
