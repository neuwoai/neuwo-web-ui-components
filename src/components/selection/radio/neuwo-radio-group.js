import { define, ownedByReact } from "../../../core/element.js";
import { CONTROLLED } from "../../../core/marks.js";
import { NeuwoControlElement } from "../../control-element.js";
import { radioGroupTemplate } from "./radio-group.template.js";

const RADIO = "neuwo-radio > .neuwo-form-check > .neuwo-form-check__input";

/**
 * Radio group: a labelled set of `<neuwo-radio>` elements, which may sit anywhere inside it, in other markup too.
 * Each radio renders a native radio that carries the group's `name`, `required` and `form`, so the browser groups
 * them: one checked at a time, arrow keys and focus, `required`, and submission with the form, before the script
 * has loaded too. The group renders the radiogroup, its legend and the error line, and has no form control of its
 * own: it dispatches no event, and the picked radio's own `input` and `change` bubble through it.
 *
 * @summary Neuwo radio group. Public classes: `.neuwo-choice` on the wrapper; `.neuwo-radio-group` on the radiogroup, with `--horizontal` and `--error`; `.neuwo-radio-group__legend` on the legend; `.neuwo-radio-group__options` around the radios; `.neuwo-choice__error` on the error line.
 * @customElement neuwo-radio-group
 * @attr name - form field name, carried onto every radio, which is what groups them; a group without one warns in the console.
 * @attr {boolean} disabled - disables every radio and removes the group from submission.
 * @attr value - the value of the radio that starts checked, carried onto the radios as their default; the live value is the `value` property.
 * @attr {boolean} required - a radio must be checked for the group to be valid.
 * @attr label - visible legend that names the group.
 * @attr {horizontal|vertical} orientation - lays the radios out in a row or a column (default: a column).
 * @attr error - error message; shows the red accent on every radio, the message, and aria-invalid on the group.
 * @attr {boolean} error-muted - softens a shown error: drops the accent while the red message and invalid state stay.
 * @attr {boolean} no-error-line - drop the reserved error message row (for a non-validated group); setting `error` alongside it is a misconfiguration.
 * @fires {Event} input - the user picked a radio; the radio's own `input`, bubbling through the group.
 * @fires {Event} change - the user picked a radio; the radio's own `change`, bubbling through the group with that radio as its target.
 * @slot - the `<neuwo-radio>` elements, directly or inside other markup.
 * @cssprop --neuwo-color-blue - brand accent (checked fill, focus ring); re-theme by setting it on :root.
 */
export class NeuwoRadioGroup extends NeuwoControlElement {
  static template = radioGroupTemplate;
  static observedAttributes = ["name", "value", "disabled", "form", "required", "label", "orientation", "error", "error-muted", "no-error-line"];

  /** @type {string | undefined} */
  #pending;

  #warned = false;

  /**
   * The first enabled radio, else the first, which answers for the group in the validity API and the form lookup:
   * every radio of a native group shares its validity, and a disabled one is barred from validation.
   * @returns {HTMLInputElement | null}
   */
  get control() {
    const radios = this.#radios();
    return radios.find((radio) => !radio.disabled) ?? radios[0] ?? null;
  }

  /**
   * The radio `focus()` moves to: the checked one, else the first enabled one, as Tab reaches a native group.
   * @returns {HTMLInputElement | null}
   */
  get focusTarget() {
    const enabled = this.#radios().filter((radio) => !radio.disabled);
    return enabled.find((radio) => radio.checked) ?? enabled[0] ?? null;
  }

  /**
   * The checked radio's value, or an empty string. Setting it checks the radio of that value, or none.
   * @returns {string}
   */
  get value() {
    const radios = this.#radios();
    if (!radios.length) return this.#pending ?? this.getAttribute("value") ?? "";
    return radios.find((radio) => radio.checked)?.value ?? "";
  }
  /** @param {string | null} value */
  set value(value) {
    if (Reflect.get(this, CONTROLLED) === true) return;
    const next = value == null ? "" : String(value);
    const radios = this.#radios();
    if (!radios.length) {
      this.#pending = next;
      return;
    }
    this.#pending = undefined;
    for (const radio of radios) radio.checked = radio.value === next;
  }

  /**
   * The starting value: the value of the radio that starts checked, which the JSX runtime renders from
   * `defaultValue` without a host attribute, else the `value` attribute. Setting it sets the attribute.
   * @returns {string}
   */
  get defaultValue() {
    const radios = this.#radios();
    if (!radios.length) return this.getAttribute("value") ?? "";
    return radios.find((radio) => radio.defaultChecked)?.value ?? "";
  }
  /** @param {string} value */
  set defaultValue(value) {
    this.setAttribute("value", String(value));
  }

  get noErrorLine() {
    return this.hasAttribute("no-error-line");
  }
  set noErrorLine(value) {
    this.toggleAttribute("no-error-line", Boolean(value));
  }

  connect() {
    super.connect();
    if (!this.#warned && !this.getAttribute("name") && this.#holdsRadios()) {
      this.#warned = true;
      console.warn(
        "<neuwo-radio-group> has no name, so the browser does not group its radios: more than one can be checked, " +
          "each is its own Tab stop, and a required group needs every radio checked. Give the group a name.",
        this,
      );
    }
    // The radios render after the group connects, so a value set before then is applied once they have.
    if (this.#pending !== undefined && !ownedByReact(this)) {
      queueMicrotask(() => {
        if (this.#pending !== undefined && this.#radios().length) this.value = this.#pending;
      });
    }
  }

  #holdsRadios() {
    return Array.from(this.querySelectorAll("neuwo-radio")).some((radio) => radio.closest("neuwo-radio-group") === this);
  }

  /** @returns {HTMLInputElement[]} */
  #radios() {
    const radios = /** @type {NodeListOf<HTMLInputElement>} */ (this.querySelectorAll(RADIO));
    return Array.from(radios).filter((radio) => radio.closest("neuwo-radio-group") === this);
  }
}

define("neuwo-radio-group", NeuwoRadioGroup);
