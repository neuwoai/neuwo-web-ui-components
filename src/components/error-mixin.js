import { NeuwoControlElement } from "./control-element.js";

/**
 * @template {typeof NeuwoControlElement} T
 * @overload
 * @param {T} Base
 * @returns {{ new (): InstanceType<T> & { noErrorLine: boolean }, prototype: InstanceType<T> & { noErrorLine: boolean } } & Omit<T, "prototype">}
 */
/**
 * The error attributes of every control that renders its own error line: the fields, the checkbox and the toggle,
 * the radio group and the segmented control. Never the radio, whose group shows the error.
 *
 * @mixin
 * @summary Error attributes for Neuwo form controls.
 * @param {typeof NeuwoControlElement} Base
 */
export function NeuwoErrorMixin(Base) {
  /**
   * @attr error - error message; shows the red accent, the message, and aria-invalid.
   * @attr {boolean} error-muted - softens a shown error: drops the accent while the red message and invalid state stay.
   * @attr {boolean} no-error-line - drop the reserved error message row (for a non-validated control); setting `error` alongside it is a misconfiguration.
   */
  class NeuwoErrorMixin extends Base {
    get noErrorLine() {
      return this.hasAttribute("no-error-line");
    }
    set noErrorLine(value) {
      this.toggleAttribute("no-error-line", Boolean(value));
    }
  }
  return NeuwoErrorMixin;
}
