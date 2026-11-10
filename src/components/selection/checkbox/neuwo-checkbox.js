import { NeuwoBooleanControl } from "../boolean-control.js";
import { define } from "../../../core/element.js";
import { formCheckSheet } from "../form-check.js";
import { controlsSheet } from "../controls.js";

/**
 * Checkbox with an optional indeterminate state.
 *
 * @summary Neuwo checkbox.
 * @customElement neuwo-checkbox
 * @prop {boolean} indeterminate - the mixed/partial state (property only, like the native checkbox).
 * @csspart field - the label/box/text row.
 * @csspart label - the checkbox label text.
 */
export class NeuwoCheckbox extends NeuwoBooleanControl {
  static formAssociated = true;
  static styles = [formCheckSheet, controlsSheet];
  static observedAttributes = NeuwoBooleanControl.observedAttributes;

  #indeterminate = false;

  get accentClass() { return "form-check--error"; }

  // Property-only, like native: no content attribute, independent of the value.
  get indeterminate() { return this.#indeterminate; }
  set indeterminate(v) {
    this.#indeterminate = Boolean(v);
    this.#applyIndeterminate();
  }

  createControl() {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "form-check__input";
    return input;
  }

  renderRow(input) {
    const label = document.createElement("label");
    label.className = "form-check";
    label.setAttribute("part", "field");
    const text = document.createElement("span");
    text.className = "form-check__label";
    text.setAttribute("part", "label");
    text.append(document.createElement("slot"));
    label.append(input, text);
    return label;
  }

  // A user toggle resolves the ambiguity, so it clears indeterminate (native parity).
  onToggle() {
    if (this.#indeterminate) {
      this.#indeterminate = false;
      this.#applyIndeterminate();
    }
  }
  syncControl() { this.#applyIndeterminate(); }

  #applyIndeterminate() {
    if (!this.control) return;
    this.control.indeterminate = this.#indeterminate;
    if (this.#indeterminate) this.control.setAttribute("aria-checked", "mixed");
    else this.control.removeAttribute("aria-checked");
  }
}

define("neuwo-checkbox", NeuwoCheckbox);
