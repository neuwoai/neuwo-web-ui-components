import { describe, expect, it } from "vitest";
import "../src/components/selection/radio/neuwo-radio.js";
import "../src/components/selection/radio/neuwo-radio-group.js";

function make(html) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.firstElementChild;
}
const RADIOS = `<neuwo-radio value="free">Free</neuwo-radio><neuwo-radio value="pro">Pro</neuwo-radio><neuwo-radio value="team" disabled>Team</neuwo-radio>`;
function radios(el) { return [...el.querySelectorAll("neuwo-radio")]; }
function inputOf(r) { return r.shadowRoot.querySelector("input"); }

describe("<neuwo-radio-group>", () => {
  it("is a radiogroup labelled by its legend", () => {
    const el = make(`<neuwo-radio-group label="Plan">${RADIOS}</neuwo-radio-group>`);
    const group = el.shadowRoot.querySelector(".radio-group");
    expect(group.getAttribute("role")).toBe("radiogroup");
    const legendId = group.getAttribute("aria-labelledby");
    expect(el.shadowRoot.getElementById(legendId).textContent).toBe("Plan");
  });

  it("is form-associated and renders radio inputs", () => {
    const el = make(`<neuwo-radio-group>${RADIOS}</neuwo-radio-group>`);
    expect(el.constructor.formAssociated).toBe(true);
    expect(radios(el).every((r) => inputOf(r).type === "radio")).toBe(true);
  });

  it("checks the radio named by the group value, exclusively", () => {
    const el = make(`<neuwo-radio-group value="pro">${RADIOS}</neuwo-radio-group>`);
    expect(inputOf(radios(el)[1]).checked).toBe(true);
    expect(inputOf(radios(el)[0]).checked).toBe(false);
  });

  it("seeds the value from a radio marked checked", () => {
    const el = make(`<neuwo-radio-group><neuwo-radio value="a">A</neuwo-radio><neuwo-radio value="b" checked>B</neuwo-radio></neuwo-radio-group>`);
    expect(el.value).toBe("b");
  });

  it("selects a radio on click and emits change", () => {
    const el = make(`<neuwo-radio-group>${RADIOS}</neuwo-radio-group>`);
    let changed = false;
    el.addEventListener("change", () => (changed = true));
    radios(el)[1].click();
    expect(el.value).toBe("pro");
    expect(changed).toBe(true);
    expect(inputOf(radios(el)[0]).checked).toBe(false);
  });

  it("roves tabindex onto the selected radio only", () => {
    const el = make(`<neuwo-radio-group value="pro">${RADIOS}</neuwo-radio-group>`);
    expect(radios(el).map((r) => inputOf(r).tabIndex)).toEqual([-1, 0, -1]);
  });

  it("arrow-navigates with selection following focus, skipping disabled", () => {
    const el = make(`<neuwo-radio-group value="free">${RADIOS}</neuwo-radio-group>`);
    inputOf(radios(el)[0]).dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    expect(el.value).toBe("pro");
    inputOf(radios(el)[1]).dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    expect(el.value).toBe("free"); // wraps past disabled team
  });

  it("fails required validity until a radio is chosen", () => {
    const el = make(`<neuwo-radio-group required>${RADIOS}</neuwo-radio-group>`);
    expect(el.checkValidity()).toBe(false);
    el.value = "free";
    expect(el.checkValidity()).toBe(true);
  });

  it("shows a group error with a red legend accent", () => {
    const el = make(`<neuwo-radio-group label="Plan" error="Please choose">${RADIOS}</neuwo-radio-group>`);
    expect(el.shadowRoot.querySelector(".control-error").textContent).toBe("Please choose");
    expect(el.shadowRoot.querySelector(".radio-group").classList.contains("radio-group--error")).toBe(true);
  });
});
