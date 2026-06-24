import { NeuwoFieldElement, fieldSheet } from "../field-element.js";
import { sheet } from "../../../core/sheet.js";
import textareaCss from "./textarea.css?raw";

/**
 * Multi-line text input.
 *
 * @summary Neuwo textarea.
 * @customElement neuwo-textarea
 * @attr {number} rows - visible row count.
 * @attr minlength - minimum text length.
 * @attr maxlength - maximum text length.
 */
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
