import { describe, expect, it } from "vitest";
import "../src/components/selection/checkbox/neuwo-checkbox.js";

function make(html) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.firstElementChild;
}

describe("<neuwo-checkbox>", () => {
  it("renders a checkbox input inside a .form-check row", () => {
    const el = make(`<neuwo-checkbox>Subscribe</neuwo-checkbox>`);
    const input = el.shadowRoot.querySelector("input.form-check__input");
    expect(input.type).toBe("checkbox");
    expect(el.shadowRoot.querySelector("label.form-check")).toBeTruthy();
  });

  it("toggles checked and reflects the attribute", () => {
    const el = make(`<neuwo-checkbox></neuwo-checkbox>`);
    expect(el.checked).toBe(false);
    el.checked = true;
    expect(el.shadowRoot.querySelector("input").checked).toBe(true);
    expect(el.hasAttribute("checked")).toBe(true);
  });

  it("uses a custom value, defaulting to 'on'", () => {
    expect(make(`<neuwo-checkbox></neuwo-checkbox>`).value).toBe("on");
    expect(make(`<neuwo-checkbox value="yes"></neuwo-checkbox>`).value).toBe("yes");
  });

  it("supports the indeterminate property and announces it as mixed", () => {
    const el = make(`<neuwo-checkbox></neuwo-checkbox>`);
    el.indeterminate = true;
    const input = el.shadowRoot.querySelector("input");
    expect(input.indeterminate).toBe(true);
    expect(input.getAttribute("aria-checked")).toBe("mixed");
  });

  it("clears indeterminate when the control is toggled", () => {
    const el = make(`<neuwo-checkbox></neuwo-checkbox>`);
    el.indeterminate = true;
    const input = el.shadowRoot.querySelector("input");
    input.checked = true;
    input.dispatchEvent(new Event("change"));
    expect(el.indeterminate).toBe(false);
    expect(input.hasAttribute("aria-checked")).toBe(false);
  });

  it("fails required validity until checked", () => {
    const el = make(`<neuwo-checkbox required></neuwo-checkbox>`);
    expect(el.checkValidity()).toBe(false);
    el.checked = true;
    expect(el.checkValidity()).toBe(true);
  });

  it("shows an error message and accent", () => {
    const el = make(`<neuwo-checkbox error="You must accept">Accept</neuwo-checkbox>`);
    expect(el.shadowRoot.querySelector(".control-error").textContent).toBe("You must accept");
    expect(el.shadowRoot.querySelector(".form-check").classList.contains("form-check--error")).toBe(true);
  });
});
