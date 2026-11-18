import { NeuwoElement, listenEarly, ownedByReact } from "../core/element.js";

/**
 * Base for the light DOM elements built on native form controls: the fields, the selection controls and the radio
 * group, whose radios are its controls. The template renders the controls, which do the form work. The element
 * reflects the shared attributes, follows its form's reset, and delegates the validity API and focus to the
 * control.
 *
 * @summary Base class for Neuwo form controls.
 * @attr name - form field name, carried onto the native control.
 * @attr {boolean} disabled - disables the control and removes it from submission.
 * @attr form - id of the form the control submits with, when the element sits outside it.
 */
export class NeuwoControlElement extends NeuwoElement {
  /** @type {HTMLFormElement | null} */
  #form = null;

  /** @type {(() => void) | null} */
  #unlisten = null;

  /** @type {Event | null} */
  #heard = null;

  /** @param {Event} event */
  #onReset = (event) => {
    if (event === this.#heard) return;
    this.#heard = event;
    setTimeout(() => this.formReset(), 0);
  };

  // React stops the reset event of a tree it has not hydrated at its root, which the early listeners precede.
  /** @param {Event} event */
  #onEarlyReset = (event) => {
    if (event.target === this.#form && !ownedByReact(this)) this.#onReset(event);
  };

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

  /**
   * Whether the native control meets its constraints (`required`, `pattern`, a custom validity message), as
   * `checkValidity()` on an `<input>` answers; an invalid control fires `invalid` on the native control. True while
   * nothing has rendered yet.
   * @returns {boolean}
   */
  checkValidity() {
    return this.control?.checkValidity() ?? true;
  }

  /**
   * Like `checkValidity()`, and when the native control is invalid the browser also shows its validation message
   * there, as `reportValidity()` on an `<input>` does. True while nothing has rendered yet.
   * @returns {boolean}
   */
  reportValidity() {
    return this.control?.reportValidity() ?? true;
  }

  /**
   * Sets a custom validation message on the native control, which keeps it invalid until the message is set back
   * to an empty string, as `setCustomValidity()` on an `<input>` does. The browser shows the message on a form
   * submit or `reportValidity()`; the error line shows only the `error` attribute.
   * @param {string} message - the message, or an empty string to make the control valid again.
   */
  setCustomValidity(message) {
    this.control?.setCustomValidity(message);
  }

  /**
   * Moves focus to the part a visitor would focus: the native control, or the combobox's trigger, the radio group's
   * checked radio (else its first enabled one) or the segmented control's selected option (else its first enabled
   * one).
   * @param {FocusOptions} [options] - passed on to the native `focus()`, such as `{ preventScroll: true }`.
   */
  focus(options) {
    this.focusTarget?.focus(options);
  }

  /** Removes focus from the part `focus()` moves it to. */
  blur() {
    this.focusTarget?.blur();
  }

  connect() {
    this.#bindForm();
    this.#unlisten?.();
    this.#unlisten = listenEarly(this, "reset", this.#onEarlyReset);
  }

  disconnect() {
    this.#form?.removeEventListener("reset", this.#onReset);
    this.#form = null;
    this.#unlisten?.();
    this.#unlisten = null;
  }

  updated() {
    this.#bindForm();
  }

  /**
   * Hook that runs in the task after the control's form resets, once the browser has put the starting value back.
   * It must write only values that differ from the DOM.
   * @protected
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
