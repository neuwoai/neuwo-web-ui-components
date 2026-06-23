import { describe, expect, it } from "vitest";
import { NeuwoBooleanControl } from "../src/components/selection/boolean-control.js";

class TestBoolean extends NeuwoBooleanControl {
  static formAssociated = true;
  static observedAttributes = NeuwoBooleanControl.observedAttributes;
  get accentClass() { return "row--error"; }
  createControl() {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "row__input";
    return input;
  }
  renderRow(input) {
    const label = document.createElement("label");
    label.className = "row";
    const text = document.createElement("span");
    text.className = "row__label";
    text.append(document.createElement("slot"));
    label.append(input, text);
    return label;
  }
}
customElements.define("test-boolean", TestBoolean);

function make(html) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.firstElementChild;
}

describe("NeuwoBooleanControl", () => {
  it("renders the row with the control and a slotted label", () => {
    const el = make(`<test-boolean>Accept</test-boolean>`);
    expect(el.shadowRoot.querySelector("label.row")).toBeTruthy();
    expect(el.shadowRoot.querySelector("input").getAttribute("part")).toBe("input");
    expect(el.shadowRoot.querySelector(".row__label slot")).toBeTruthy();
  });

  it("is form-associated and defaults its value to 'on'", () => {
    const el = make(`<test-boolean></test-boolean>`);
    expect(el.constructor.formAssociated).toBe(true);
    expect(el.value).toBe("on");
  });

  it("seeds checked from the attribute and reflects the property", () => {
    const el = make(`<test-boolean checked></test-boolean>`);
    expect(el.checked).toBe(true);
    el.checked = false;
    expect(el.checked).toBe(false);
    expect(el.hasAttribute("checked")).toBe(false);
  });

  it("fails required validity until checked", () => {
    const el = make(`<test-boolean required></test-boolean>`);
    expect(el.checkValidity()).toBe(false);
    el.checked = true;
    expect(el.checkValidity()).toBe(true);
  });

  it("re-dispatches change when the inner control changes", () => {
    const el = make(`<test-boolean></test-boolean>`);
    let heard = false;
    el.addEventListener("change", () => (heard = true));
    const input = el.shadowRoot.querySelector("input");
    input.checked = true;
    input.dispatchEvent(new Event("change"));
    expect(heard).toBe(true);
    expect(el.checked).toBe(true);
  });

  it("reflects disabled to the inner control", () => {
    const el = make(`<test-boolean></test-boolean>`);
    el.disabled = true;
    expect(el.shadowRoot.querySelector("input").disabled).toBe(true);
  });

  it("shows an error via the reserved line and accent, and clears it", () => {
    const el = make(`<test-boolean error="Required">Accept</test-boolean>`);
    const line = el.shadowRoot.querySelector(".control-error");
    expect(line.textContent).toBe("Required");
    expect(el.shadowRoot.querySelector(".row").classList.contains("row--error")).toBe(true);
    expect(el.shadowRoot.querySelector("input").getAttribute("aria-invalid")).toBe("true");
    el.removeAttribute("error");
    expect(el.shadowRoot.querySelector(".control-error").textContent).toBe("");
    expect(el.shadowRoot.querySelector(".row").classList.contains("row--error")).toBe(false);
  });

  it("restores the initial checked state on form reset", () => {
    const el = make(`<test-boolean checked></test-boolean>`);
    el.checked = false;
    el.formResetCallback();
    expect(el.checked).toBe(true);
  });
});
