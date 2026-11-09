import { describe, expect, it } from "vitest";
import "../src/components/fields/range/neuwo-range.js";

function make(html) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.firstElementChild;
}

const fillOf = (el) => el.shadowRoot.querySelector("input").style.getPropertyValue("--neuwo-range-fill");

describe("<neuwo-range>", () => {
  it("registers and renders a range input on the portable class", () => {
    const el = make(`<neuwo-range></neuwo-range>`);
    expect(customElements.get("neuwo-range")).toBeTruthy();
    const control = el.shadowRoot.querySelector("input");
    expect(control.type).toBe("range");
    expect(control.classList.contains("range")).toBe(true);
    expect(control.getAttribute("part")).toBe("input");
  });

  it("forwards the bounds to the control", () => {
    const el = make(`<neuwo-range min="10" max="90" step="5"></neuwo-range>`);
    const control = el.shadowRoot.querySelector("input");
    expect(control.getAttribute("min")).toBe("10");
    expect(control.getAttribute("max")).toBe("90");
    expect(control.getAttribute("step")).toBe("5");
  });

  it("does not forward the text-field attributes that a slider has no use for", () => {
    const el = make(`<neuwo-range placeholder="nope" autocomplete="off" readonly></neuwo-range>`);
    const control = el.shadowRoot.querySelector("input");
    for (const name of ["placeholder", "autocomplete", "readonly"])
      expect(control.hasAttribute(name)).toBe(false);
  });

  it("seeds a value outside the default 0-100 window", () => {
    // The bounds have to reach the control before the value, or the native clamp
    // squeezes the seed into 0-100 and it is lost.
    const el = make(`<neuwo-range min="1000" max="100000" value="50000"></neuwo-range>`);
    expect(el.value).toBe("50000");
  });

  it("writes the filled portion of the track as a percentage", () => {
    const el = make(`<neuwo-range min="0" max="200" value="50"></neuwo-range>`);
    expect(fillOf(el)).toBe("25%");
  });

  it("re-computes the fill against the bounds, not the raw value", () => {
    const el = make(`<neuwo-range min="100" max="300" value="150"></neuwo-range>`);
    expect(fillOf(el)).toBe("25%");
  });

  it("updates the fill when the value property is set", () => {
    const el = make(`<neuwo-range min="0" max="100" value="10"></neuwo-range>`);
    expect(fillOf(el)).toBe("10%");
    el.value = "80";
    expect(fillOf(el)).toBe("80%");
  });

  it("updates the fill when the bounds change", () => {
    const el = make(`<neuwo-range min="0" max="100" value="50"></neuwo-range>`);
    expect(fillOf(el)).toBe("50%");
    el.setAttribute("max", "200");
    expect(fillOf(el)).toBe("25%");
  });

  it("clamps the fill to the track when the value sits outside the bounds", () => {
    const el = make(`<neuwo-range min="0" max="100" value="500"></neuwo-range>`);
    expect(fillOf(el)).toBe("100%");
  });

  it("restores the seeded value and its fill on form reset", () => {
    const el = make(`<neuwo-range min="0" max="100" value="20"></neuwo-range>`);
    el.value = "90";
    el.formResetCallback();
    expect(el.value).toBe("20");
    expect(fillOf(el)).toBe("20%");
  });

  it("forwards a re-written aria-valuetext without waiting for another render", () => {
    const el = make(`<neuwo-range min="0" max="100" value="40"></neuwo-range>`);
    el.setAttribute("aria-valuetext", "40 per cent");
    expect(el.shadowRoot.querySelector("input").getAttribute("aria-valuetext")).toBe("40 per cent");
  });

  it("carries the shared field label and disabled behaviour", () => {
    const el = make(`<neuwo-range label="Page views" value="1"></neuwo-range>`);
    expect(el.shadowRoot.querySelector("label.field__label").textContent).toBe("Page views");
    el.disabled = true;
    expect(el.shadowRoot.querySelector("input").disabled).toBe(true);
  });

  it("drops the reserved error line on request", () => {
    const el = make(`<neuwo-range no-error-line></neuwo-range>`);
    expect(el.shadowRoot.querySelector(".field__error")).toBeNull();
  });
});
