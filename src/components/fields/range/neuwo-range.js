import { NeuwoFieldElement, fieldSheet } from "../field-element.js";
import { sheet } from "../../../core/sheet.js";
import rangeCss from "./range.css?raw";

/**
 * Slider over a numeric range. Owns the filled-track sync that WebKit cannot do
 * on its own: every value change writes `--range-fill` onto the control, so the
 * portion left of the thumb reads as filled in both engines and a consumer never
 * writes that plumbing again.
 *
 * `placeholder`, `autocomplete` and `readonly` do not apply to a slider and are
 * not forwarded. `required` is likewise inert, since a range always has a value.
 *
 * @summary Neuwo range slider.
 * @customElement neuwo-range
 * @attr min - lowest selectable value (default 0).
 * @attr max - highest selectable value (default 100).
 * @attr step - step granularity (default 1).
 * @attr aria-valuetext - human reading of the current value ("2.4M page views"); forwarded to the control, and observed so a consumer can rewrite it as the slider moves.
 * @csspart input - the native range control.
 * @cssprop --range-track-height - thickness of the track (default 0.375rem).
 * @cssprop --range-thumb-size - diameter of the thumb (default 0.875rem).
 * @cssprop --range-fill - filled portion of the track; written by the component on every value change, not a consumer knob.
 */
export class NeuwoRange extends NeuwoFieldElement {
  static formAssociated = true;
  static styles = [fieldSheet, sheet(rangeCss)];
  // `aria-valuetext` is observed, not just forwarded: a slider's readable value
  // is formatted by the consumer and rewritten on every drag, so it has to reach
  // the control without waiting for some other attribute to trigger a render.
  static observedAttributes = [
    ...NeuwoFieldElement.observedAttributes,
    "min",
    "max",
    "step",
    "aria-valuetext",
  ];

  createControl() {
    const control = document.createElement("input");
    control.type = "range";
    control.classList.add("range");
    // The bounds have to be in place before the base seeds the value: a native
    // range clamps whatever it is given to the bounds it has at that moment, so
    // seeding first against the default 0-100 would silently lose the value.
    for (const name of ["min", "max", "step"]) {
      if (this.hasAttribute(name)) control.setAttribute(name, this.getAttribute(name));
    }
    return control;
  }

  get forwardedAttributes() {
    return ["name", "min", "max", "step"];
  }

  wireControl(control) {
    super.wireControl(control);
    // Dragging fires `input` without touching an attribute, so without this the
    // fill would only catch up at the next render.
    control.addEventListener("input", () => this.#syncFill());
  }

  writeValue(value) {
    super.writeValue(value);
    this.#syncFill();
  }

  // Runs at the end of every render, after the bounds have been forwarded.
  syncControl() {
    this.#syncFill();
  }

  #syncFill() {
    const control = this.control;
    if (!control) return;
    // Read the attributes rather than the IDL properties, so the bounds resolve
    // the same way in every rendering environment. Absent ones take the native
    // defaults for a range.
    const min = Number(control.getAttribute("min") ?? 0);
    const max = Number(control.getAttribute("max") ?? 100);
    const value = Number(control.value);
    let percent = 0;
    if (max > min && Number.isFinite(value)) {
      // A browser clamps the value to the bounds, other environments may not.
      percent = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
    }
    control.style.setProperty("--range-fill", `${percent}%`);
  }
}

customElements.define("neuwo-range", NeuwoRange);
