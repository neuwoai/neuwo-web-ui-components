import { define } from "../../../core/element.js";
import { NeuwoChoiceElement } from "../choice-element.js";
import { checkboxTemplate } from "./checkbox.template.js";

/**
 * Checkbox with an optional indeterminate state. The native checkbox inside is the form control, so it submits
 * with its form and validates natively.
 *
 * @summary Neuwo checkbox. Public classes: `.neuwo-choice` on the wrapper; `.neuwo-form-check` on the `<label>`, with `--error`; `.neuwo-form-check__input` on the native checkbox; `.neuwo-form-check__label` around the label content; `.neuwo-choice__error` on the error line.
 * @customElement neuwo-checkbox
 * @prop {boolean} indeterminate - the mixed state of the native checkbox, which a click clears: a property only, like the native one.
 * @slot - the label content, inside the `<label>` that wraps the checkbox.
 */
export class NeuwoCheckbox extends NeuwoChoiceElement {
  static template = checkboxTemplate;

  #indeterminate = false;

  /** @returns {HTMLInputElement | null} */
  get control() {
    return this.querySelector(":scope > .neuwo-choice > .neuwo-form-check > .neuwo-form-check__input");
  }

  /** @returns {boolean} */
  get indeterminate() {
    return this.control?.indeterminate ?? this.#indeterminate;
  }
  /** @param {boolean} value */
  set indeterminate(value) {
    const control = this.control;
    if (control) control.indeterminate = Boolean(value);
    else this.#indeterminate = Boolean(value);
  }

  connect() {
    super.connect();
    const control = this.control;
    if (control && this.#indeterminate) {
      control.indeterminate = true;
      this.#indeterminate = false;
    }
  }
}

define("neuwo-checkbox", NeuwoCheckbox);
