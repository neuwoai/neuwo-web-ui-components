import { NeuwoCheckableElement } from "./checkable-element.js";

/**
 * Base for the checkable controls that show their own error (checkbox, toggle): the native control's row, then
 * the reserved error line.
 *
 * @summary Base class for Neuwo checkboxes and switches.
 * @attr error - error message; shows the red accent, the message, and aria-invalid.
 * @attr {boolean} error-muted - softens a shown error: drops the accent while the red message and invalid state stay.
 * @attr {boolean} no-error-line - drop the reserved error message row (for a non-validated control); setting `error` alongside it is a misconfiguration.
 */
export class NeuwoChoiceElement extends NeuwoCheckableElement {
  static observedAttributes = [...NeuwoCheckableElement.observedAttributes, "error", "error-muted", "no-error-line"];
}
