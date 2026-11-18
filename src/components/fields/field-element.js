import { ownedByReact } from "../../core/element.js";
import { CONTROLLED } from "../../core/marks.js";
import { NeuwoControlElement } from "../control-element.js";
import { NeuwoDefaultValueMixin } from "../default-value-mixin.js";
import { NeuwoErrorMixin } from "../error-mixin.js";

/**
 * Base for the field controls (input, textarea, combobox, range). The template renders a native control inside
 * the field's light DOM, and that control does the form work: it carries `name`, the starting `value`,
 * `required` and `disabled`, validates natively and submits with its form, before the script has loaded too.
 * The element reads and writes the live value on it and delegates the validity API and focus to it.
 *
 * @summary Base class for Neuwo field controls.
 * @attr value - the starting value, carried onto the native control as its default; the live value is the `value` property.
 * @attr placeholder - placeholder text shown when empty.
 * @attr {boolean} required - the field must have a value to be valid.
 * @attr {boolean} readonly - the value is shown but cannot be edited.
 * @attr autocomplete - native autocomplete hint carried onto the control.
 * @attr {sm} size - compact density step for the control, label and error line (default: the standard size when the attribute is absent).
 * @attr label - visible label text rendered above the control, unless a `slot="label"` child replaces it.
 * @attr {boolean} error-muted - softens a shown error: drops the border/box-shadow accent while the red message and invalid state stay.
 * @fires {Event} input - the value changed as the user typed or moved it; the native control's own `input`, bubbling through the element.
 * @fires {Event} change - the user committed a new value; the native control's own `change`, bubbling through the element.
 * @slot label - rich label content (a help link, a badge, emphasis) replacing the `label` attribute text, inside the associated `<label>`. The required marker still follows it.
 * @cssprop --neuwo-color-blue - brand accent (focus ring); re-theme by setting it on :root.
 */
export class NeuwoFieldElement extends NeuwoErrorMixin(NeuwoDefaultValueMixin(NeuwoControlElement)) {
  static observedAttributes = [
    "name",
    "value",
    "placeholder",
    "disabled",
    "form",
    "required",
    "readonly",
    "autocomplete",
    "size",
    "label",
    "error",
    "error-muted",
    "no-error-line",
  ];

  /** @type {string | undefined} */
  #pending;

  /**
   * The native form control this field renders.
   * @returns {HTMLInputElement | HTMLTextAreaElement | null}
   */
  get control() {
    return this.querySelector(":scope > .neuwo-field > .neuwo-input");
  }

  /**
   * The value the field shows now, read from and written to the native control; the `value` attribute is only the
   * starting value. A write before the control renders is held until it does, and a write to a field React
   * controls is ignored, since React holds its value.
   * @returns {string}
   */
  get value() {
    const control = this.control;
    return control ? control.value : (this.#pending ?? this.getAttribute("value") ?? "");
  }
  set value(value) {
    if (Reflect.get(this, CONTROLLED) === true) return;
    const next = value == null ? "" : String(value);
    const control = this.control;
    if (control) control.value = next;
    else this.#pending = next;
  }

  get size() {
    return this.getAttribute("size") ?? "";
  }
  set size(value) {
    if (value == null || value === "") this.removeAttribute("size");
    else this.setAttribute("size", String(value));
  }

  connect() {
    super.connect();
    const control = this.control;
    // React's ref sets the controlled flag after connect, so on a React host a write here could undo React's value.
    if (control && this.#pending !== undefined && !ownedByReact(this)) {
      control.value = this.#pending;
      this.#pending = undefined;
    }
  }
}
