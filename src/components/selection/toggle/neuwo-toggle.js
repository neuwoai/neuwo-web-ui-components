import { NeuwoBooleanControl } from "../boolean-control.js";
import { sheet } from "../../../core/sheet.js";
import { controlsSheet } from "../controls.js";
import toggleCss from "./toggle.css?raw";

/**
 * On/off switch backed by a hidden native checkbox.
 *
 * With `pulse`, a switch that is still off rings in the brand accent to invite
 * the visitor to flip it, and stops the moment it is on. The stopping is done
 * by the recipe's selector, not by JavaScript, so switching back and forth
 * never restarts the ring mid-cycle.
 *
 * @summary Neuwo toggle / switch.
 * @customElement neuwo-toggle
 * @attr {boolean} pulse - ring the track while the switch is off, to draw attention to it; honours prefers-reduced-motion.
 * @csspart field - the track/label row.
 * @csspart track - the switch track (its ::after is the thumb).
 * @csspart label - the toggle label text.
 * @cssprop --neuwo-toggle-pulse-spread - how far the pulse ring travels (default 12px). No effect without `pulse`.
 * @cssprop --neuwo-toggle-pulse-alpha - opacity the pulse ring starts from (default 40%). No effect without `pulse`.
 */
export class NeuwoToggle extends NeuwoBooleanControl {
  static formAssociated = true;
  static styles = [sheet(toggleCss), controlsSheet];
  static observedAttributes = [...NeuwoBooleanControl.observedAttributes, "pulse"];

  get accentClass() { return "form-toggle--error"; }

  get pulse() { return this.hasAttribute("pulse"); }
  set pulse(value) { this.toggleAttribute("pulse", Boolean(value)); }

  // Runs at the end of every patch. The class only says the axis is on; the
  // recipe decides when the ring actually runs.
  syncControl() {
    this.row?.classList.toggle("form-toggle--pulse", this.hasAttribute("pulse"));
  }

  createControl() {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("role", "switch");
    input.className = "form-toggle__input";
    return input;
  }

  renderRow(input) {
    const label = document.createElement("label");
    label.className = "form-toggle";
    label.setAttribute("part", "field");
    const track = document.createElement("span");
    track.className = "form-toggle__track";
    track.setAttribute("part", "track");
    track.setAttribute("aria-hidden", "true");
    const text = document.createElement("span");
    text.className = "form-toggle__label";
    text.setAttribute("part", "label");
    text.append(document.createElement("slot"));
    label.append(input, track, text);
    return label;
  }
}

customElements.define("neuwo-toggle", NeuwoToggle);
