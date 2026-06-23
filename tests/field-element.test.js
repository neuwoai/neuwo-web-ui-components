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
    // The error line stays in the DOM (reserved slot) but loses its text.
    expect(el.shadowRoot.querySelector(".field__error").textContent).toBe("");
    expect(control.hasAttribute("aria-describedby")).toBe(false);
  });

  it("keeps an empty error line present without an error (reserved, no layout shift)", () => {
    const el = make(`<test-field></test-field>`);
    const error = el.shadowRoot.querySelector(".field__error");
    expect(error).toBeTruthy();
    expect(error.textContent).toBe("");
    expect(el.shadowRoot.querySelector("input").hasAttribute("aria-describedby")).toBe(false);
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

  it("sets aria-invalid on the control when error has a message", () => {
    const el = make(`<test-field error="Required"></test-field>`);
    const control = el.shadowRoot.querySelector("input");
    expect(control.getAttribute("aria-invalid")).toBe("true");
  });

  it("sets aria-invalid on the control when error is a bare attribute", () => {
    const el = make(`<test-field error></test-field>`);
    const control = el.shadowRoot.querySelector("input");
    expect(control.getAttribute("aria-invalid")).toBe("true");
  });

  it("removes aria-invalid when the error attribute is removed", () => {
    const el = make(`<test-field error="Required"></test-field>`);
    el.removeAttribute("error");
    const control = el.shadowRoot.querySelector("input");
    expect(control.hasAttribute("aria-invalid")).toBe(false);
  });

  it("formDisabledCallback(true) disables the inner control", () => {
    const el = make(`<test-field></test-field>`);
    const control = el.shadowRoot.querySelector("input");
    el.formDisabledCallback(true);
    expect(control.disabled).toBe(true);
  });

  it("formDisabledCallback(false) re-enables the control when the host has no disabled attribute", () => {
    const el = make(`<test-field></test-field>`);
    const control = el.shadowRoot.querySelector("input");
    el.formDisabledCallback(true);
    el.formDisabledCallback(false);
    expect(control.disabled).toBe(false);
  });

  it("formDisabledCallback(false) leaves control disabled when the host has the disabled attribute", () => {
    const el = make(`<test-field disabled></test-field>`);
    const control = el.shadowRoot.querySelector("input");
    el.formDisabledCallback(false);
    expect(control.disabled).toBe(true);
  });

  it("routes value through the overridable readValue/writeValue seams", () => {
    class SeamField extends NeuwoFieldElement {
      static formAssociated = true;
      static styles = fieldSheet;
      static observedAttributes = NeuwoFieldElement.observedAttributes;
      stored = "";
      createControl() { return document.createElement("button"); }
      wireControl() {} // no native input/change wiring
      seedValue() { this.stored = this.defaultValue; }
      readValue() { return this.stored; }
      writeValue(v) { this.stored = v; }
    }
    customElements.define("seam-field", SeamField);
    const el = make(`<seam-field value="x"></seam-field>`);
    expect(el.value).toBe("x");      // readValue
    el.value = "y";                   // writeValue + setFormValue
    expect(el.value).toBe("y");
  });
});
