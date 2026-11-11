import { NeuwoControlElement } from "./control-element.js";

/**
 * @template {typeof NeuwoControlElement} T
 * @overload
 * @param {T} Base
 * @returns {{ new (): InstanceType<T> & { get defaultValue(): string, set defaultValue(value: string) }, prototype: InstanceType<T> & { get defaultValue(): string, set defaultValue(value: string) } } & Omit<T, "prototype">}
 */
/**
 * The starting value of every control whose `value` attribute holds it: the fields, the radio group and the
 * segmented control.
 *
 * @mixin
 * @summary Starting value for Neuwo form controls.
 * @param {typeof NeuwoControlElement} Base
 */
export function NeuwoDefaultValueMixin(Base) {
  class NeuwoDefaultValueMixin extends Base {
    /**
     * The starting value: the control's default, which the JSX runtime renders from `defaultValue` without a host
     * attribute, else the `value` attribute. Setting it sets the attribute.
     * @returns {string}
     */
    get defaultValue() {
      return this.control?.defaultValue ?? this.getAttribute("value") ?? "";
    }
    /** @param {string} value */
    set defaultValue(value) {
      this.setAttribute("value", String(value));
    }
  }
  return NeuwoDefaultValueMixin;
}
