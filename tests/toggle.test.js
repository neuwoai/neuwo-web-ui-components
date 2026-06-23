import { describe, expect, it } from "vitest";
import "../src/components/selection/toggle/neuwo-toggle.js";

function make(html) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.firstElementChild;
}

describe("<neuwo-toggle>", () => {
  it("renders a switch input and a visible track", () => {
    const el = make(`<neuwo-toggle>Notifications</neuwo-toggle>`);
    const input = el.shadowRoot.querySelector("input.form-toggle__input");
    expect(input.type).toBe("checkbox");
    expect(input.getAttribute("role")).toBe("switch");
    expect(el.shadowRoot.querySelector(".form-toggle__track")).toBeTruthy();
  });

  it("toggles checked and reflects the attribute", () => {
    const el = make(`<neuwo-toggle></neuwo-toggle>`);
    el.checked = true;
    expect(el.shadowRoot.querySelector("input").checked).toBe(true);
    expect(el.hasAttribute("checked")).toBe(true);
  });

  it("re-dispatches change from the inner switch", () => {
    const el = make(`<neuwo-toggle></neuwo-toggle>`);
    let heard = false;
    el.addEventListener("change", () => (heard = true));
    const input = el.shadowRoot.querySelector("input");
    input.checked = true;
    input.dispatchEvent(new Event("change"));
    expect(heard).toBe(true);
    expect(el.checked).toBe(true);
  });

  it("shows an error accent on the track and reserves the line", () => {
    const el = make(`<neuwo-toggle error="Turn this on">On</neuwo-toggle>`);
    expect(el.shadowRoot.querySelector(".form-toggle").classList.contains("form-toggle--error")).toBe(true);
    expect(el.shadowRoot.querySelector(".control-error").textContent).toBe("Turn this on");
  });

  it("restores the initial checked state on form reset", () => {
    const el = make(`<neuwo-toggle checked></neuwo-toggle>`);
    el.checked = false;
    el.formResetCallback();
    expect(el.checked).toBe(true);
  });
});
