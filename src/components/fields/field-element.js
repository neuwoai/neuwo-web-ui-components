import { NeuwoElement, ownedByReact } from "../../core/element.js";
import { CONTROLLED } from "../../core/marks.js";

/**
 * Base for the field controls (input, textarea, combobox, range). The template renders a native control inside
 * the field's light DOM, and that control does the form work: it carries `name`, the starting `value`,
 * `required` and `disabled`, validates natively and submits with its form, before the script has loaded too.
 * The element reads and writes the live value on it and delegates the validity API and focus to it.
 *
 * @summary Base class for Neuwo field controls.
 * @attr name - form field name, carried onto the native control.
 * @attr value - the starting value, carried onto the native control as its default; the live value is the `value` property.
 * @attr placeholder - placeholder text shown when empty.
 * @attr {boolean} disabled - disables the control and removes it from submission.
 * @attr form - id of the form the control submits with, when the field sits outside it.
 * @attr {boolean} required - the field must have a value to be valid.
 * @attr {boolean} readonly - the value is shown but cannot be edited.
 * @attr autocomplete - native autocomplete hint carried onto the control.
 * @attr {sm} size - compact density step for the control, label and error line (default: the standard size when the attribute is absent).
 * @attr label - visible label text rendered above the control, unless a `slot="label"` child replaces it.
 * @attr error - error message; shows the red accent, the message, and aria-invalid.
 * @attr {boolean} error-muted - softens a shown error: drops the border/box-shadow accent while the red message and invalid state stay.
 * @attr {boolean} no-error-line - drop the reserved error message row (for a non-validated control); setting `error` alongside it is a misconfiguration.
 * @fires {Event} change - the user committed a new value; the native control's own `change`, bubbling through the element.
 * @slot label - rich label content (a help link, a badge, emphasis) replacing the `label` attribute text, inside the associated `<label>`. The required marker still follows it.
 * @cssprop --neuwo-color-blue - brand accent (focus ring); re-theme by setting it on :root.
 */
export class NeuwoFieldElement extends NeuwoElement {
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

  /** @type {HTMLFormElement | null} */
  #form = null;

  #onReset = () => {
    setTimeout(() => this.formReset(), 0);
  };

  /**
   * The native form control this field renders.
   * @returns {HTMLInputElement | HTMLTextAreaElement | null}
   */
  get control() {
    return this.querySelector(":scope > .neuwo-field > .neuwo-input");
  }

  /**
   * The element `focus()` and `blur()` act on.
   * @returns {HTMLElement | null}
   */
  get focusTarget() {
    return this.control;
  }

  /** @returns {string} */
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

  /** @returns {string} */
  get defaultValue() {
    return this.getAttribute("value") ?? "";
  }
  set defaultValue(value) {
    this.setAttribute("value", String(value));
  }

  /** @returns {string} */
  get name() {
    return this.getAttribute("name") ?? "";
  }
  set name(value) {
    if (value == null || value === "") this.removeAttribute("name");
    else this.setAttribute("name", String(value));
  }

  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(value) {
    this.toggleAttribute("disabled", Boolean(value));
  }

  get size() {
    return this.getAttribute("size") ?? "";
  }
  set size(value) {
    if (value == null || value === "") this.removeAttribute("size");
    else this.setAttribute("size", String(value));
  }

  get noErrorLine() {
    return this.hasAttribute("no-error-line");
  }
  set noErrorLine(value) {
    this.toggleAttribute("no-error-line", Boolean(value));
  }

  /**
   * The form the control submits with. Setting it sets the `form` attribute to a form's id, as React does for a
   * `form` prop.
   * @returns {HTMLFormElement | null}
   */
  get form() {
    return this.control?.form ?? null;
  }
  /** @param {string | null} value */
  set form(value) {
    if (value == null || value === "") this.removeAttribute("form");
    else this.setAttribute("form", String(value));
  }

  /** @returns {ValidityState | undefined} */
  get validity() {
    return this.control?.validity;
  }

  /** @returns {string} */
  get validationMessage() {
    return this.control?.validationMessage ?? "";
  }

  /** @returns {boolean} */
  checkValidity() {
    return this.control?.checkValidity() ?? true;
  }

  /** @returns {boolean} */
  reportValidity() {
    return this.control?.reportValidity() ?? true;
  }

  /** @param {string} message */
  setCustomValidity(message) {
    this.control?.setCustomValidity(message);
  }

  /** @param {FocusOptions} [options] */
  focus(options) {
    this.focusTarget?.focus(options);
  }

  blur() {
    this.focusTarget?.blur();
  }

  connect() {
    this.#bindForm();
    const control = this.control;
    // React's ref sets the controlled flag after connect, so on a React host a write here could undo React's value.
    if (control && this.#pending !== undefined && !ownedByReact(this)) {
      control.value = this.#pending;
      this.#pending = undefined;
    }
  }

  disconnect() {
    this.#form?.removeEventListener("reset", this.#onReset);
    this.#form = null;
  }

  updated() {
    this.#bindForm();
  }

  /**
   * Hook that runs in the task after the control's form resets, once the browser has put the starting value back.
   * It must write only values that differ from the DOM.
   */
  formReset() {}

  #bindForm() {
    const form = this.control?.form ?? null;
    if (form === this.#form) return;
    this.#form?.removeEventListener("reset", this.#onReset);
    form?.addEventListener("reset", this.#onReset);
    this.#form = form;
  }
}
