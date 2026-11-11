import { define } from "../../../core/element.js";
import { NeuwoChoiceElement } from "../choice-element.js";
import { toggleTemplate } from "./toggle.template.js";

/**
 * On/off switch backed by a visually hidden native checkbox with `role="switch"`, which is the form control.
 *
 * With `pulse`, a switch that is still off rings in the brand accent to invite
 * the visitor to flip it, and stops the moment it is on. The stopping is done
 * by the recipe's selector, not by JavaScript, so switching back and forth
 * never restarts the ring mid-cycle.
 *
 * @summary Neuwo toggle / switch. Public classes: `.neuwo-choice` on the wrapper; `.neuwo-form-toggle` on the `<label>`, with `--pulse` and `--error`; `.neuwo-form-toggle__input` on the visually hidden native switch; `.neuwo-form-toggle__track` on the switch track, whose `::after` is the thumb; `.neuwo-form-toggle__label` around the label content; `.neuwo-choice__error` on the error line.
 * @customElement neuwo-toggle
 * @attr {boolean} pulse - ring the track while the switch is off, to draw attention to it; honours prefers-reduced-motion.
 * @slot - the label content, inside the `<label>` that wraps the switch.
 * @cssprop --neuwo-toggle-pulse-spread - how far the pulse ring travels (default 12px). No effect without `pulse`.
 * @cssprop --neuwo-toggle-pulse-alpha - opacity the pulse ring starts from (default 40%). No effect without `pulse`.
 */
export class NeuwoToggle extends NeuwoChoiceElement {
  static template = toggleTemplate;
  static observedAttributes = [...NeuwoChoiceElement.observedAttributes, "pulse"];

  /** @returns {HTMLInputElement | null} */
  get control() {
    return this.querySelector(":scope > .neuwo-choice > .neuwo-form-toggle > .neuwo-form-toggle__input");
  }

  get pulse() {
    return this.hasAttribute("pulse");
  }
  set pulse(value) {
    this.toggleAttribute("pulse", Boolean(value));
  }
}

define("neuwo-toggle", NeuwoToggle);
