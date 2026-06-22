import { NeuwoFieldElement } from "../field-element.js";

// Single-line, text-shaped types. An unknown value falls back to text.
const TYPES = ["text", "email", "url", "password", "number", "search", "tel"];

export class NeuwoInput extends NeuwoFieldElement {
  static formAssociated = true;
  static observedAttributes = [
    ...NeuwoFieldElement.observedAttributes,
    "type",
    "min",
    "max",
    "step",
    "pattern",
    "minlength",
    "maxlength",
    "inputmode",
  ];

  createControl() {
    return document.createElement("input");
  }

  syncControl() {
    const type = this.getAttribute("type");
    this.control.type = TYPES.includes(type) ? type : "text";
  }

  get forwardedAttributes() {
    return [
      ...super.forwardedAttributes,
      "min",
      "max",
      "step",
      "pattern",
      "minlength",
      "maxlength",
      "inputmode",
    ];
  }
}

customElements.define("neuwo-input", NeuwoInput);
