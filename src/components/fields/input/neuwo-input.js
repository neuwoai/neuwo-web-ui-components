import { NeuwoFieldElement } from "../field-element.js";

// Single-line, text-shaped types. An unknown value falls back to text.
const TYPES = ["text", "email", "url", "password", "number", "search", "tel"];

/**
 * Single-line text input. Adds the native text-input type and constraint
 * attributes over the shared field chrome.
 *
 * @summary Neuwo text input.
 * @customElement neuwo-input
 * @attr {text|email|url|password|number|search|tel} type - input type (default text).
 * @attr min - minimum value (number/date types).
 * @attr max - maximum value (number/date types).
 * @attr step - step granularity (number types).
 * @attr pattern - validation regular expression.
 * @attr minlength - minimum text length.
 * @attr maxlength - maximum text length.
 * @attr inputmode - virtual keyboard hint.
 */
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
