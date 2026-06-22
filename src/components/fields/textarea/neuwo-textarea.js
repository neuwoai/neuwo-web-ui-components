import { NeuwoFieldElement, fieldSheet } from "../field-element.js";
import { sheet } from "../../../core/sheet.js";
import textareaCss from "./textarea.css?raw";

export class NeuwoTextarea extends NeuwoFieldElement {
  static formAssociated = true;
  static styles = [fieldSheet, sheet(textareaCss)];
  static observedAttributes = [
    ...NeuwoFieldElement.observedAttributes,
    "rows",
    "minlength",
    "maxlength",
  ];

  createControl() {
    return document.createElement("textarea");
  }

  get forwardedAttributes() {
    return [...super.forwardedAttributes, "rows", "minlength", "maxlength"];
  }
}

customElements.define("neuwo-textarea", NeuwoTextarea);
