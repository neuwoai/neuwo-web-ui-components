import { define } from "../../../core/element.js";
import { NeuwoFieldElement } from "../field-element.js";
import { inputTemplate } from "./input.template.js";

/**
 * Single-line text input. Adds the native text-input type and constraint
 * attributes over the shared field shell. The native `<input>` inside is the
 * form control, so it submits with its form and validates natively.
 *
 * @summary Neuwo text input. Public classes: `.neuwo-field` on the wrapper, with `--sm`; `.neuwo-field__label` on the `<label>`, with `--empty` while nothing labels the field; `.neuwo-field__label-content` around the `slot="label"` children; `.neuwo-field__label-text` around the `label` text; `.neuwo-field__required` on the required marker; `.neuwo-input` on the native `<input>`, with `--sm`, `--error` and `--mono`; `.neuwo-field__error` on the error line.
 * @customElement neuwo-input
 * @attr {text|email|url|password|number|search|tel} type - input type (default text).
 * @attr {string | number} min - minimum value (number/date types).
 * @attr {string | number} max - maximum value (number/date types).
 * @attr {string | number} step - step granularity (number types).
 * @attr pattern - validation regular expression.
 * @attr {string | number} minlength - minimum text length.
 * @attr {string | number} maxlength - maximum text length.
 * @attr inputmode - virtual keyboard hint.
 * @attr {boolean} mono - sets the value and the placeholder in the brand's monospace face (`--neuwo-font-mono`), for code, API keys and IDs.
 */
export class NeuwoInput extends NeuwoFieldElement {
  static template = inputTemplate;
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
    "mono",
  ];

  get mono() { return this.hasAttribute("mono"); }
  set mono(value) { this.toggleAttribute("mono", Boolean(value)); }
}

define("neuwo-input", NeuwoInput);
