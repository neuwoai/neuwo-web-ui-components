import { NeuwoElement } from "../../core/base-element.js";
import { syncError } from "../../core/control-error.js";

// Unique ids for the in-shadow control and error association.
let uid = 0;

// Shared base for the boolean form controls (checkbox, toggle). Each wraps a
// real native <input> so role, :checked styling, focus and accessible name come
// for free; this base owns form association, the checked/value/disabled API,
// required validity, error display, and a build-once-then-patch render. The
// markup (which input, which row) is supplied by createControl()/renderRow().
/**
 * Base for the boolean selection controls (checkbox, toggle). Owns form
 * association, the checked state, required validity, and error display.
 *
 * @summary Base class for Neuwo boolean controls.
 * @attr name - form field name submitted when checked.
 * @attr value - value submitted when checked (defaults to "on").
 * @attr {boolean} checked - whether the control is on.
 * @attr {boolean} disabled - disables the control and removes it from submission.
 * @attr {boolean} required - the control must be checked to be valid.
 * @attr error - error message; shows the red accent, the message, and aria-invalid.
 * @attr {boolean} error-muted - softens a shown error: drops the accent while the red message and invalid state stay.
 * @attr {boolean} no-error-line - drop the reserved error message row (for a non-validated control); setting `error` alongside it is a misconfiguration.
 * @fires {Event} change - the checked state changed.
 * @slot - the control's label content.
 * @csspart input - the underlying native input.
 * @csspart error - the reserved error message line.
 * @cssprop --neuwo-color-blue - brand accent (checked fill, focus ring); re-theme on :root.
 */
export class NeuwoBooleanControl extends NeuwoElement {
  static formAssociated = true;
  static observedAttributes = ["name", "value", "checked", "disabled", "required", "error", "error-muted", "no-error-line"];

  #internals;
  #control;
  #row;
  #id = `neuwo-control-${++uid}`;
  #defaultChecked = false;
  #built = false;

  constructor() {
    super();
    this.#internals = typeof this.attachInternals === "function" ? this.attachInternals() : null;
  }

  // --- hooks ---
  createControl() {
    throw new Error("NeuwoBooleanControl subclasses must implement createControl()");
  }
  renderRow(control) {
    throw new Error("NeuwoBooleanControl subclasses must implement renderRow()");
  }
  /** @returns {string} */
  get accentClass() {
    throw new Error("NeuwoBooleanControl subclasses must define accentClass");
  }
  onToggle() {}
  syncControl() {}

  // --- protected ---
  get internals() { return this.#internals; }
  get control() { return this.#control; }
  get row() { return this.#row; }
  get controlId() { return this.#id; }

  // --- public API ---
  get checked() {
    return this.#control ? this.#control.checked : this.hasAttribute("checked");
  }
  set checked(v) {
    const on = Boolean(v);
    if (this.#control) this.#control.checked = on;
    this.toggleAttribute("checked", on);
    this.#internals?.setFormValue(on ? this.value : null);
    this.#syncValidity();
  }
  get value() { return this.getAttribute("value") ?? "on"; }
  set value(v) { this.setAttribute("value", String(v)); }
  get disabled() { return this.hasAttribute("disabled"); }
  set disabled(v) { this.toggleAttribute("disabled", Boolean(v)); }
  get noErrorLine() { return this.hasAttribute("no-error-line"); }
  set noErrorLine(v) { this.toggleAttribute("no-error-line", Boolean(v)); }

  checkValidity() {
    if (this.#internals && typeof this.#internals.checkValidity === "function")
      return this.#internals.checkValidity();
    return !(this.hasAttribute("required") && !this.checked);
  }
  reportValidity() {
    if (this.#internals && typeof this.#internals.reportValidity === "function")
      return this.#internals.reportValidity();
    return this.checkValidity();
  }
  #syncValidity() {
    if (!this.#internals || typeof this.#internals.setValidity !== "function") return;
    if (this.hasAttribute("required") && !this.checked)
      this.#internals.setValidity({ valueMissing: true }, "Please tick this box.", this.#control);
    else this.#internals.setValidity({});
  }

  formResetCallback() {
    this.checked = this.#defaultChecked;
    this.removeAttribute("error");
  }
  formDisabledCallback(disabled) {
    if (this.#control) this.#control.disabled = disabled || this.hasAttribute("disabled");
  }

  // --- render ---
  render() {
    if (this.#built) this.#patch();
    else this.#build();
  }

  #build() {
    this.#control = this.createControl();
    this.#control.id = this.#id;
    this.#control.setAttribute("part", "input");
    this.#defaultChecked = this.hasAttribute("checked");
    this.#control.checked = this.#defaultChecked;

    this.#row = this.renderRow(this.#control);
    this.shadowRoot.append(this.#row);
    this.#control.addEventListener("change", this.#onChange);

    this.#built = true;
    this.#patch();
    this.#internals?.setFormValue(this.checked ? this.value : null);
  }

  #patch() {
    this.#control.disabled = this.hasAttribute("disabled");
    this.#control.checked = this.hasAttribute("checked");
    for (const name of ["name", "required"]) {
      if (this.hasAttribute(name)) this.#control.setAttribute(name, this.getAttribute(name) ?? "");
      else this.#control.removeAttribute(name);
    }
    for (const { name, value } of this.attributes) {
      if (name === "title" || name.startsWith("aria-") || name.startsWith("data-"))
        this.#control.setAttribute(name, value);
    }
    syncError(this, {
      announce: this.#control,
      accentEl: this.#row,
      accentClass: this.accentClass,
      container: this.shadowRoot,
      lineClass: "control-error",
      lineId: `${this.#id}-error`,
    });
    this.syncControl();
    this.#syncValidity();
    this.#internals?.setFormValue(this.checked ? this.value : null);
  }

  #onChange = () => {
    this.toggleAttribute("checked", this.#control.checked);
    this.onToggle();
    this.#internals?.setFormValue(this.#control.checked ? this.value : null);
    this.#syncValidity();
    this.dispatchEvent(new Event("change", { bubbles: true }));
  };
}
