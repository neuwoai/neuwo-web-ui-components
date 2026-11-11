import { NeuwoErrorMixin } from "../error-mixin.js";
import { NeuwoCheckableElement } from "./checkable-element.js";

/**
 * Base for the checkable controls that show their own error (checkbox, toggle): the native control's row, then
 * the reserved error line.
 *
 * @summary Base class for Neuwo checkboxes and switches.
 */
export class NeuwoChoiceElement extends NeuwoErrorMixin(NeuwoCheckableElement) {
  static observedAttributes = [...NeuwoCheckableElement.observedAttributes, "error", "error-muted", "no-error-line"];
}
