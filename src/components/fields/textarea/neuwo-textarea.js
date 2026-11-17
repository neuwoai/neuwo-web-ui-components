import { define } from "../../../core/element.js";
import { NeuwoTextFieldElement } from "../text-field-element.js";
import { textareaTemplate } from "./textarea.template.js";

/**
 * Multi-line text input. The `value` attribute is the textarea's starting text. The native `<textarea>` inside is
 * the form control, so it submits with its form and validates natively.
 *
 * @summary Neuwo textarea. Shares the field's classes (see `neuwo-input`), with `.neuwo-textarea` added on the native `<textarea>`. For 0.9 s after `flashError()` the element carries `data-neuwo-state="error-flash"`.
 * @customElement neuwo-textarea
 * @attr {string | number} rows - visible row count.
 * @attr {string | number} minlength - minimum text length.
 * @attr {string | number} maxlength - maximum text length.
 * @attr {boolean} mono - sets the text and the placeholder in the brand's monospace face (`--neuwo-font-mono`), a step smaller than a prose field of the same size (`--neuwo-font-size-sm`, or `--neuwo-font-size-xs` with `size="sm"`) and with the same padding, for code and JSON.
 */
export class NeuwoTextarea extends NeuwoTextFieldElement {
  static template = textareaTemplate;
  static observedAttributes = [...NeuwoTextFieldElement.observedAttributes, "rows", "minlength", "maxlength", "mono"];

  get mono() { return this.hasAttribute("mono"); }
  set mono(value) { this.toggleAttribute("mono", Boolean(value)); }
}

define("neuwo-textarea", NeuwoTextarea);
