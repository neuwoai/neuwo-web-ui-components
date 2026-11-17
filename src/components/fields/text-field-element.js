import { NeuwoFieldElement } from "./field-element.js";

// neuwo.ai's API demo holds its empty-field flash for 900ms.
const FLASH_DURATION = 900;

/**
 * Base for the text fields (input, textarea): the field, plus a short-lived error look for a check the page runs
 * itself, such as a run button that needs a URL.
 *
 * @summary Base class for Neuwo text fields.
 */
export class NeuwoTextFieldElement extends NeuwoFieldElement {
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  #timer;

  /**
   * Show the error look (the red border, the danger ring and the shake) for 0.9 s, then return to rest. It prints no
   * message, sets no invalid state and leaves `error` as it is, and it wins over focus while it shows. Calling it
   * again restarts it.
   * @returns {void}
   */
  flashError() {
    clearTimeout(this.#timer);
    this.removeAttribute("data-neuwo-state");
    // Reading layout between the removal and the write restarts the shake of a flash that is still showing.
    void this.offsetWidth;
    this.setAttribute("data-neuwo-state", "error-flash");
    this.#timer = setTimeout(() => this.#rest(), FLASH_DURATION);
  }

  disconnect() {
    super.disconnect();
    this.#rest();
  }

  #rest() {
    clearTimeout(this.#timer);
    this.removeAttribute("data-neuwo-state");
  }
}
