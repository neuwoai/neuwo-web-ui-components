import { NeuwoElement, define } from "../../core/element.js";
import { noticeTemplate } from "./notice.template.js";

/**
 * Notice card: a message the visitor did not ask for, on the shared glass
 * surface. One element covers the consent banner, the language hint and any
 * toast, because the things that differ between them are separate axes rather
 * than one bundled variant: where it docks (`position`), whether the actions sit
 * beside the text or under it (`layout`), and whether it can be closed at all
 * (`dismissible`, which a consent banner deliberately is not).
 *
 * Visibility is the native `hidden` attribute, so a card that has to wait for a
 * decision starts hidden in the markup and is revealed with `el.hidden = false`.
 * Closing is the consumer's to remember: the component hides the card and fires
 * `dismiss`, and the page stores that however it stores anything else. Under
 * React, cancel `dismiss` and drive `hidden` from state, so the element never
 * changes a host React owns.
 *
 * The card announces itself politely with `role="status"` unless the host
 * declares a role of its own: a consent banner is a question, so give the host
 * `role="dialog"` and a label.
 *
 * @summary Neuwo dismissible notice card. Public classes: `.neuwo-notice` on the card, with `--fixed`, `--top`, `--bottom`, `--start`, `--end`, `--center`, `--row` and `--dismissible`; `.neuwo-notice__content` around `.neuwo-notice__title` and `.neuwo-notice__message`; `.neuwo-notice__actions`; `.neuwo-notice__dismiss` on the close button, with `--filled`. A title, message or actions wrapper nothing fills also carries its `--empty` modifier.
 * @customElement neuwo-notice
 * @attr {bottom-end|bottom-start|bottom-center|top-end|top-start|top-center|static} position - where the card docks; `static` flows with the page instead of pinning to the viewport (default bottom-end).
 * @attr {stack|row} layout - actions under the text, or beside it from 48rem up (default stack).
 * @attr {boolean} dismissible - render the close button.
 * @attr dismiss-label - accessible name for the close button (default "Dismiss"); set it to the visitor's language.
 * @attr {boolean} dismiss-filled - give the close button a subtle background, stronger on hover and keyboard focus, so it stands out on a busy or coloured card. No effect without `dismissible`.
 * @fires {CustomEvent} dismiss - the close button was pressed or `dismiss()` was called; cancelable, and cancelling keeps the card open.
 * @slot title - the headline line; a notice with nothing else is just this.
 * @slot - the supporting message under the headline.
 * @slot actions - the buttons a notice asks for (accept, reject, read more).
 * @cssprop --neuwo-notice-max-width - how wide the card may grow (default 24rem).
 * @cssprop --neuwo-notice-gutter - air a fixed card keeps from the viewport edges (default var(--neuwo-space-4)).
 */
export class NeuwoNotice extends NeuwoElement {
  static template = noticeTemplate;
  static observedAttributes = ["position", "layout", "dismissible", "dismiss-label", "dismiss-filled"];

  get position() { return this.getAttribute("position") || "bottom-end"; }
  set position(value) {
    if (value == null || value === "") this.removeAttribute("position");
    else this.setAttribute("position", String(value));
  }

  get layout() { return this.getAttribute("layout") || "stack"; }
  set layout(value) {
    if (value == null || value === "") this.removeAttribute("layout");
    else this.setAttribute("layout", String(value));
  }

  get dismissible() { return this.hasAttribute("dismissible"); }
  set dismissible(value) { this.toggleAttribute("dismissible", Boolean(value)); }

  get dismissFilled() { return this.hasAttribute("dismiss-filled"); }
  set dismissFilled(value) { this.toggleAttribute("dismiss-filled", Boolean(value)); }

  get dismissLabel() { return this.getAttribute("dismiss-label") || "Dismiss"; }
  set dismissLabel(value) {
    if (value == null || value === "") this.removeAttribute("dismiss-label");
    else this.setAttribute("dismiss-label", String(value));
  }

  /**
   * Close the card the way the button does: fire `dismiss`, then hide unless a
   * listener cancelled it. Public so a consumer can drive it from a timer or
   * from their own control.
   * @returns {boolean} false when a listener cancelled the dismissal.
   */
  dismiss() {
    const proceed = this.dispatchEvent(new CustomEvent("dismiss", { bubbles: true, composed: true, cancelable: true }));
    if (proceed) this.hidden = true;
    return proceed;
  }

  connect() {
    this.addEventListener("click", this.#click);
  }

  disconnect() {
    this.removeEventListener("click", this.#click);
  }

  /** @param {Event} event */
  #click = (event) => {
    const target = event.target instanceof Element ? event.target.closest(".neuwo-notice__dismiss") : null;
    if (target && target === this.querySelector(":scope > .neuwo-notice > .neuwo-notice__dismiss")) this.dismiss();
  };
}

define("neuwo-notice", NeuwoNotice);
