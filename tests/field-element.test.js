import { describe, expect, it } from "vitest";
import { NeuwoFieldElement, fieldSheet } from "../src/components/fields/field-element.js";

class TestField extends NeuwoFieldElement {
  static formAssociated = true;
  static styles = fieldSheet;
  static observedAttributes = NeuwoFieldElement.observedAttributes;
  createControl() {
    return document.createElement("input");
  }
}
customElements.define("test-field", TestField);

function make(html) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.firstElementChild;
}

describe("NeuwoFieldElement", () => {
  it("renders the control inside a .field wrapper with part=input", () => {
    const el = make(`<test-field></test-field>`);
    expect(el.shadowRoot.querySelector(".field")).toBeTruthy();
    const control = el.shadowRoot.querySelector("input");
    expect(control.classList.contains("input")).toBe(true);
    expect(control.getAttribute("part")).toBe("input");
  });

  it("renders a label associated to the control", () => {
    const el = make(`<test-field label="Work email"></test-field>`);
    const label = el.shadowRoot.querySelector("label.field__label");
    const control = el.shadowRoot.querySelector("input");
    expect(label.textContent).toBe("Work email");
    expect(label.getAttribute("for")).toBe(control.id);
  });

  it("seeds the initial value and mirrors the value property", () => {
    const el = make(`<test-field value="hi"></test-field>`);
    const control = el.shadowRoot.querySelector("input");
    expect(control.value).toBe("hi");
    expect(el.value).toBe("hi");
    el.value = "bye";
    expect(control.value).toBe("bye");
  });

  it("forwards name, placeholder and required to the control", () => {
    const el = make(`<test-field name="email" placeholder="you@x.com" required></test-field>`);
    const control = el.shadowRoot.querySelector("input");
    expect(control.getAttribute("name")).toBe("email");
    expect(control.getAttribute("placeholder")).toBe("you@x.com");
    expect(control.hasAttribute("required")).toBe(true);
  });

  it("reflects disabled to the attribute and the control", () => {
    const el = make(`<test-field></test-field>`);
    expect(el.disabled).toBe(false);
    el.disabled = true;
    expect(el.hasAttribute("disabled")).toBe(true);
    expect(el.shadowRoot.querySelector("input").disabled).toBe(true);
  });

  it("applies the error look and renders the message wired by aria-describedby", () => {
    const el = make(`<test-field error="Required"></test-field>`);
    const control = el.shadowRoot.querySelector("input");
    const message = el.shadowRoot.querySelector(".field__error");
    expect(control.classList.contains("input--error")).toBe(true);
    expect(message.textContent).toBe("Required");
    expect(control.getAttribute("aria-describedby")).toBe(message.id);
  });

  it("clears the error state when the attribute is removed", () => {
    const el = make(`<test-field error="Required"></test-field>`);
    el.removeAttribute("error");
    const control = el.shadowRoot.querySelector("input");
    expect(control.classList.contains("input--error")).toBe(false);
    expect(el.shadowRoot.querySelector(".field__error")).toBeNull();
    expect(control.hasAttribute("aria-describedby")).toBe(false);
  });

  it("re-dispatches change from the host", () => {
    const el = make(`<test-field></test-field>`);
    let heard = false;
    el.addEventListener("change", () => (heard = true));
    el.shadowRoot.querySelector("input").dispatchEvent(new Event("change"));
    expect(heard).toBe(true);
  });

  it("delegates checkValidity to the control", () => {
    const el = make(`<test-field required></test-field>`);
    expect(el.checkValidity()).toBe(false);
    el.value = "filled";
    expect(el.checkValidity()).toBe(true);
  });

  it("restores the initial value on form reset", () => {
    const el = make(`<test-field value="seed"></test-field>`);
    el.value = "typed";
    el.formResetCallback();
    expect(el.shadowRoot.querySelector("input").value).toBe("seed");
  });
});
