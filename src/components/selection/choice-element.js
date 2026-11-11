import { NeuwoElement, ownedByReact } from "../../core/element.js";
import { CONTROLLED } from "../../core/marks.js";

/**
 * Base for the selection controls built on one native checkable control (checkbox, toggle). The template renders
 * a native checkbox inside the element's light DOM, and that control does the form work: it carries `name`,
 * `value`, the starting `checked` state, `required` and `disabled`, validates natively and submits with its form,
 * before the script has loaded too. The element reads and writes the live state on it and delegates the validity
 * API and focus to it.
 *
 * @summary Base class for Neuwo selection controls.
 * @attr name - form field name, carried onto the native control.
 * @attr value - the value submitted while the control is checked (default `on`), carried onto the native control.
 * @attr {boolean} checked - the starting state, carried onto the native control as its default; the live state is the `checked` property.
 * @attr {boolean} disabled - disables the control and removes it from submission.
 * @attr form - id of the form the control submits with, when the element sits outside it.
 * @attr {boolean} required - the control must be checked to be valid.
 * @attr error - error message; shows the red accent, the message, and aria-invalid.
 * @attr {boolean} error-muted - softens a shown error: drops the accent while the red message and invalid state stay.
 * @attr {boolean} no-error-line - drop the reserved error message row (for a non-validated control); setting `error` alongside it is a misconfiguration.
 * @fires {Event} input - the user checked or unchecked the control; the native control's own `input`, bubbling through the element.
 * @fires {Event} change - the user checked or unchecked the control; the native control's own `change`, bubbling through the element.
 * @cssprop --neuwo-color-blue - brand accent (checked fill, focus ring); re-theme by setting it on :root.
 */
export class NeuwoChoiceElement extends NeuwoElement {
  static observedAttributes = ["name", "value", "checked", "disabled", "form", "required", "error", "error-muted", "no-error-line"];

  /** @type {boolean | undefined} */
  #pending;

  /** @type {HTMLFormElement | null} */
  #form = null;

  #onReset = () => {
    setTimeout(() => this.formReset(), 0);
  };

  /**
   * The native control this element renders; each control names its own.
   * @returns {HTMLInputElement | null}
   */
  get control() {
    return null;
  }

  /** @returns {boolean} */
  get checked() {
    const control = this.control;
    return control ? control.checked : (this.#pending ?? this.hasAttribute("checked"));
  }
  /** @param {boolean} value */
  set checked(value) {
    if (Reflect.get(this, CONTROLLED) === true) return;
    const control = this.control;
    if (control) control.checked = Boolean(value);
    else this.#pending = Boolean(value);
  }

  /** @returns {boolean} */
  get defaultChecked() {
    return this.hasAttribute("checked");
  }
  /** @param {boolean} value */
  set defaultChecked(value) {
    this.toggleAttribute("checked", Boolean(value));
  }

  /** @returns {string} */
  get value() {
    return this.control?.value ?? this.getAttribute("value") ?? "on";
  }
  /** @param {string | null} value */
  set value(value) {
    if (value == null) this.removeAttribute("value");
    else this.setAttribute("value", String(value));
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
    this.control?.focus(options);
  }

  blur() {
    this.control?.blur();
  }

  connect() {
    this.#bindForm();
    const control = this.control;
    // React's ref sets the controlled flag after connect, so on a React host a write here could undo React's state.
    if (control && this.#pending !== undefined && !ownedByReact(this)) {
      control.checked = this.#pending;
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
   * Hook that runs in the task after the control's form resets, once the browser has put the starting state back.
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
