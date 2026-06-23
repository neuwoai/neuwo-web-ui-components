import { NeuwoBooleanControl } from "../boolean-control.js";
import { sheet } from "../../../core/sheet.js";
import { controlsSheet } from "../controls.js";
import toggleCss from "./toggle.css?raw";

export class NeuwoToggle extends NeuwoBooleanControl {
  static formAssociated = true;
  static styles = [sheet(toggleCss), controlsSheet];
  static observedAttributes = NeuwoBooleanControl.observedAttributes;

  get accentClass() { return "form-toggle--error"; }

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
