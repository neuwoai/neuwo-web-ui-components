import { define } from "../../../core/element.js";
import { NeuwoFieldElement } from "../field-element.js";
import { textareaTemplate } from "./textarea.template.js";

/**
 * Multi-line text input. The `value` attribute is the textarea's starting text. The native `<textarea>` inside is
 * the form control, so it submits with its form and validates natively.
 *
 * @summary Neuwo textarea. Shares the field's classes (see `neuwo-input`), with `.neuwo-textarea` added on the native `<textarea>`.
 * @customElement neuwo-textarea
 * @attr {number} rows - visible row count.
 * @attr minlength - minimum text length.
 * @attr maxlength - maximum text length.
 */
export class NeuwoTextarea extends NeuwoFieldElement {
  static template = textareaTemplate;
  static observedAttributes = [...NeuwoFieldElement.observedAttributes, "rows", "minlength", "maxlength"];
}

define("neuwo-textarea", NeuwoTextarea);
