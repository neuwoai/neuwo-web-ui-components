import { define, ownedByReact } from "../../../core/element.js";
import { CONTROLLED } from "../../../core/marks.js";
import { NeuwoFieldElement } from "../field-element.js";
import { fillPercent, rangeTemplate } from "./range.template.js";

/**
 * Slider over a numeric range. The template writes `--neuwo-range-fill` onto the native range input, so the
 * portion left of the thumb reads as filled in the first paint in both engines. The element keeps it current
 * as the thumb moves, the value is set, a bound changes or the form resets, so a consumer never writes that
 * plumbing.
 *
 * `placeholder`, `autocomplete` and `readonly` do not apply to a slider and are not forwarded. `required` is
 * likewise inert, since a range always has a value.
 *
 * @summary Neuwo range slider. Shares the field's classes (see `neuwo-input`), with `.neuwo-range` added on the native range input.
 * @customElement neuwo-range
 * @attr {string | number} min - lowest selectable value (default 0).
 * @attr {string | number} max - highest selectable value (default 100).
 * @attr {string | number} step - step granularity (default 1).
 * @attr aria-valuetext - human reading of the current value ("2.4M page views"); forwarded to the control, and observed so a consumer can rewrite it as the slider moves.
 * @cssprop --neuwo-range-track-height - thickness of the track (default 0.375rem).
 * @cssprop --neuwo-range-thumb-size - diameter of the thumb (default 0.875rem).
 * @cssprop --neuwo-range-fill - filled portion of the track; written by the component, not a consumer knob.
 */
export class NeuwoRange extends NeuwoFieldElement {
  static template = rangeTemplate;
  static observedAttributes = [...NeuwoFieldElement.observedAttributes, "min", "max", "step", "aria-valuetext"];

  /** @type {MutationObserver | null} */
  #styleObserver = null;

  #onInput = (/** @type {Event} */ event) => {
    if (event.target === this.control) this.#syncFill();
  };

  /** @returns {string} */
  get value() {
    return super.value;
  }
  set value(value) {
    super.value = value;
    this.#syncFill();
  }

  connect() {
    super.connect();
    this.addEventListener("input", this.#onInput);
    const control = this.control;
    if (!ownedByReact(this)) this.#syncFill();
    // Every host watches, since React can hydrate one after it connected and then write the template's fill back.
    this.#styleObserver ??= new MutationObserver(() => {
      if (ownedByReact(this)) this.#syncFill();
    });
    if (control) this.#styleObserver.observe(control, { attributes: true, attributeFilter: ["style"] });
  }

  disconnect() {
    super.disconnect();
    this.#styleObserver?.disconnect();
    this.removeEventListener("input", this.#onInput);
  }

  updated() {
    super.updated();
    this.#syncFill();
  }

  formReset() {
    this.#syncFill();
  }

  #syncFill() {
    const control = this.control;
    if (!control || Reflect.get(this, CONTROLLED) === true) return;
    const fill = `${fillPercent(control.value, control.getAttribute("min"), control.getAttribute("max"))}%`;
    if (control.style.getPropertyValue("--neuwo-range-fill") !== fill) control.style.setProperty("--neuwo-range-fill", fill);
  }
}

define("neuwo-range", NeuwoRange);
