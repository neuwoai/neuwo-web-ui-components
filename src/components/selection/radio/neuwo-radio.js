import { define } from "../../../core/element.js";
import { NeuwoCheckableElement } from "../checkable-element.js";
import { radioTemplate } from "./radio.template.js";

/**
 * A native radio inside its label. In a `<neuwo-radio-group>`, at any depth, it takes the group's `name`,
 * `required` and `form` and is disabled with the group, so the browser groups the radios: one checked at a time,
 * arrow keys, `required`, and submission with the form, before the script has loaded too. Outside a group it is a
 * radio of its own.
 *
 * @summary Neuwo radio. Public classes: `.neuwo-form-check` on the `<label>`; `.neuwo-form-check__input` on the native radio; `.neuwo-form-check__label` around the label content.
 * @customElement neuwo-radio
 * @attr name - the form field name carried onto the native radio outside a group, or in a group with no `name`; a group's `name` applies otherwise.
 * @attr {boolean} checked - the starting state, outside a group or in one with no `value`; a group's `value` decides it otherwise. The live state is the `checked` property.
 * @attr {boolean} disabled - disables this radio; a disabled group disables all of its radios.
 * @attr form - outside a group, the id of the form the radio submits with; inside one, the group's applies.
 * @attr {boolean} required - outside a group, the radio must be checked to be valid; inside one, the group's applies.
 * @slot - the label content, inside the `<label>` that wraps the radio.
 */
export class NeuwoRadio extends NeuwoCheckableElement {
  static template = radioTemplate;

  /** @returns {HTMLInputElement | null} */
  get control() {
    return this.querySelector(":scope > .neuwo-form-check > .neuwo-form-check__input");
  }

  /** @returns {string} */
  get type() {
    return "radio";
  }
}

define("neuwo-radio", NeuwoRadio);
