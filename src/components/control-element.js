import { NeuwoElement } from "../core/element.js";

/**
 * Whether the nearest definition of `name` on the prototype chain has a setter.
 * @param {object | null} proto
 * @param {string} name
 * @returns {boolean}
 */
function settable(proto, name) {
  for (let each = proto; each; each = Object.getPrototypeOf(each)) {
    const descriptor = Object.getOwnPropertyDescriptor(each, name);
    if (descriptor) return typeof descriptor.set === "function";
  }
  return false;
}

/**
 * Base for the light DOM elements built on one native form control: the fields and the selection controls. The
 * template renders that control, which does the form work. The element reflects the shared attributes, follows
 * its form's reset, and delegates the validity API and focus to the control.
 *
 * @summary Base class for Neuwo form controls.
 * @attr name - form field name, carried onto the native control.
 * @attr {boolean} disabled - disables the control and removes it from submission.
 * @attr error - error message; shows the red accent, the message, and aria-invalid.
 * @attr {boolean} no-error-line - drop the reserved error message row (for a non-validated control); setting `error` alongside it is a misconfiguration.
 */
export class NeuwoControlElement extends NeuwoElement {
  /** @type {Map<string, unknown>} */
  #early = new Map();

  /** @type {HTMLFormElement | null} */
  #form = null;

  #onReset = () => {
    setTimeout(() => this.formReset(), 0);
  };

  constructor() {
    super();
    // A script that sets a property before the element is defined leaves an own property hiding the accessor.
    for (const name of Object.keys(this)) {
      if (!settable(Object.getPrototypeOf(this), name)) continue;
      this.#early.set(name, Reflect.get(this, name));
      Reflect.deleteProperty(this, name);
    }
    if (this.#early.size) queueMicrotask(() => this.#restore());
  }

  /**
   * The native control this element renders; each control names its own.
   * @returns {HTMLInputElement | HTMLTextAreaElement | null}
   */
  get control() {
    return null;
  }

  /**
   * The element `focus()` and `blur()` act on.
   * @returns {HTMLElement | null}
   */
  get focusTarget() {
    return this.control;
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
    this.focusTarget?.focus(options);
  }

  blur() {
    this.focusTarget?.blur();
  }

  connect() {
    this.#restore();
    this.#bindForm();
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

  #restore() {
    const early = Array.from(this.#early);
    this.#early.clear();
    for (const [name, value] of early) Reflect.set(this, name, value);
  }

  #bindForm() {
    const form = this.control?.form ?? null;
    if (form === this.#form) return;
    this.#form?.removeEventListener("reset", this.#onReset);
    form?.addEventListener("reset", this.#onReset);
    this.#form = form;
  }
}
