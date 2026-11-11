import { ownedByReact } from "../../core/element.js";
import { CONTROLLED } from "../../core/marks.js";
import { NeuwoControlElement } from "../control-element.js";

/**
 * Base for the selection controls built on one native checkable control (checkbox, toggle, radio). The template
 * renders a native checkbox or radio inside the element's light DOM, and that control does the form work: it
 * carries `name`, `value`, the starting `checked` state, `required` and `disabled`, validates natively and submits
 * with its form, before the script has loaded too. The element reads and writes the live state on it and
 * delegates the validity API and focus to it.
 *
 * @summary Base class for Neuwo checkable controls.
 * @attr value - the value submitted while the control is checked (default `on`), carried onto the native control.
 * @attr {boolean} checked - the starting state, carried onto the native control as its default; the live state is the `checked` property.
 * @attr {boolean} required - the control must be checked to be valid.
 * @fires {Event} input - the user checked or unchecked the control; the native control's own `input`, bubbling through the element.
 * @fires {Event} change - the user checked or unchecked the control; the native control's own `change`, bubbling through the element.
 * @cssprop --neuwo-color-blue - brand accent (checked fill, focus ring); re-theme by setting it on :root.
 */
export class NeuwoCheckableElement extends NeuwoControlElement {
  static observedAttributes = ["name", "value", "checked", "disabled", "form", "required"];

  /** @type {boolean | undefined} */
  #pending;

  /**
   * The native control this element renders; each control names its own.
   * @returns {HTMLInputElement | null}
   */
  get control() {
    return null;
  }

  /**
   * The native control's type, which form libraries such as React Hook Form read to tell a checkbox from a
   * radio: they then read and write `checked`, and read `value` only while it is checked.
   * @returns {string}
   */
  get type() {
    return "checkbox";
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

  /**
   * The starting state: the control's, which the JSX runtime renders from `defaultChecked` without a host
   * attribute, else the `checked` attribute. Setting it sets the attribute.
   * @returns {boolean}
   */
  get defaultChecked() {
    return this.control?.defaultChecked ?? this.hasAttribute("checked");
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

  connect() {
    super.connect();
    const control = this.control;
    // React's ref sets the controlled flag after connect, so on a React host a write here could undo React's state.
    if (control && this.#pending !== undefined && !ownedByReact(this)) {
      control.checked = this.#pending;
      this.#pending = undefined;
    }
  }
}
