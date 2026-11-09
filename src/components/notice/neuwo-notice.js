import { NeuwoShadowElement } from "../../core/shadow-element.js";
import { sheet } from "../../core/sheet.js";
import noticeCss from "./notice.css?raw";

// Placement, composed from independent edge modifiers rather than one class per
// corner: `bottom-end` is `--fixed --bottom --end`. `static` opts out of fixed
// positioning entirely and lets the card flow with the page.
const PLACEMENTS = {
  "bottom-end": ["fixed", "bottom", "end"],
  "bottom-start": ["fixed", "bottom", "start"],
  "bottom-center": ["fixed", "bottom", "center"],
  "top-end": ["fixed", "top", "end"],
  "top-start": ["fixed", "top", "start"],
  "top-center": ["fixed", "top", "center"],
  static: [],
};
const DEFAULT_POSITION = "bottom-end";
const DEFAULT_DISMISS_LABEL = "Dismiss";

function el(tag, className, part) {
  const node = document.createElement(tag);
  node.className = className;
  node.setAttribute("part", part);
  return node;
}

function slot(name) {
  const node = document.createElement("slot");
  if (name) node.setAttribute("name", name);
  return node;
}

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
 * `dismiss`, and the page stores that however it stores anything else.
 *
 * Links inside slotted content are styled by the host page, not from in here: a
 * shadow root cannot reach an `<a>` nested inside slotted markup. Linking the
 * published `typography.css` gives them the brand treatment.
 *
 * @summary Neuwo dismissible notice card.
 * @customElement neuwo-notice
 * @attr {bottom-end|bottom-start|bottom-center|top-end|top-start|top-center|static} position - where the card docks; `static` flows with the page instead of pinning to the viewport (default bottom-end).
 * @attr {stack|row} layout - actions under the text, or beside it from 48rem up (default stack).
 * @attr {boolean} dismissible - render the close button.
 * @attr dismiss-label - accessible name for the close button (default "Dismiss"); set it to the visitor's language.
 * @fires {CustomEvent} dismiss - the close button was pressed; cancelable, and cancelling keeps the card open.
 * @slot title - the headline line; a notice with nothing else is just this.
 * @slot - the supporting message under the headline.
 * @slot actions - the buttons a notice asks for (accept, reject, read more).
 * @csspart notice - the card.
 * @csspart content - the text column.
 * @csspart title - the headline line.
 * @csspart message - the supporting message.
 * @csspart actions - the actions row.
 * @csspart dismiss - the close button.
 * @cssprop --neuwo-notice-max-width - how wide the card may grow (default 24rem).
 * @cssprop --neuwo-notice-gutter - air a fixed card keeps from the viewport edges (default var(--neuwo-space-4)).
 */
export class NeuwoNotice extends NeuwoShadowElement {
  static styles = sheet(noticeCss);
  static observedAttributes = ["position", "layout", "dismissible", "dismiss-label"];

  #card = null;
  #content = null;
  #titleEl = null;
  #messageEl = null;
  #actionsEl = null;
  #dismissEl = null;
  #slots = [];

  get position() { return this.getAttribute("position") || DEFAULT_POSITION; }
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

  get dismissLabel() { return this.getAttribute("dismiss-label") || DEFAULT_DISMISS_LABEL; }
  set dismissLabel(value) {
    if (value == null || value === "") this.removeAttribute("dismiss-label");
    else this.setAttribute("dismiss-label", String(value));
  }

  connectedCallback() {
    super.connectedCallback(); // builds via render()
    // A notice arrives unprompted, so it announces itself politely unless the
    // consumer has declared something stronger: a consent banner is a dialog,
    // because it is a question that has to be answered.
    if (!this.hasAttribute("role")) this.setAttribute("role", "status");
  }

  /**
   * Close the card the way the button does: fire `dismiss`, then hide unless a
   * listener cancelled it. Public so a consumer can drive it from a timer or
   * from their own control.
   * @returns {boolean} false when a listener cancelled the dismissal.
   */
  dismiss() {
    const proceed = this.dispatchEvent(
      new CustomEvent("dismiss", { bubbles: true, composed: true, cancelable: true })
    );
    if (proceed) this.hidden = true;
    return proceed;
  }

  // Built once and patched afterwards. Re-creating the card on every attribute
  // change would replay the entrance animation and drop focus from the close
  // button, both of which a visitor would see.
  render() {
    if (!this.#card) this.#build();
    this.#patch();
  }

  #build() {
    this.#card = el("div", "notice", "notice");
    this.#content = el("div", "notice__content", "content");
    this.#titleEl = el("p", "notice__title", "title");
    // A `div`, not a `p`: the message often is a paragraph already, and a
    // paragraph cannot contain one.
    this.#messageEl = el("div", "notice__message", "message");
    this.#actionsEl = el("div", "notice__actions", "actions");

    this.#slots = [slot("title"), slot(), slot("actions")];
    this.#titleEl.append(this.#slots[0]);
    this.#messageEl.append(this.#slots[1]);
    this.#actionsEl.append(this.#slots[2]);
    for (const s of this.#slots) s.addEventListener("slotchange", () => this.#syncSlots());

    this.#content.append(this.#titleEl, this.#messageEl);
    this.#card.append(this.#content, this.#actionsEl);
    this.shadowRoot.replaceChildren(this.#card);
  }

  #patch() {
    const placement = PLACEMENTS[this.getAttribute("position")] ?? PLACEMENTS[DEFAULT_POSITION];
    const classes = ["notice", ...placement.map((edge) => `notice--${edge}`)];
    if (this.getAttribute("layout") === "row") classes.push("notice--row");
    if (this.dismissible) classes.push("notice--dismissible");
    this.#card.className = classes.join(" ");
    this.#syncDismiss();
    this.#syncSlots();
  }

  #syncDismiss() {
    if (!this.dismissible) {
      this.#dismissEl?.remove();
      this.#dismissEl = null;
      return;
    }
    if (!this.#dismissEl) {
      this.#dismissEl = el("button", "notice__dismiss", "dismiss");
      this.#dismissEl.type = "button";
      this.#dismissEl.addEventListener("click", () => this.dismiss());
      // Appended last, so the button paints over the corner of the text.
      this.#card.append(this.#dismissEl);
    }
    this.#dismissEl.setAttribute("aria-label", this.dismissLabel);
  }

  // Read the light DOM rather than assignedNodes(), so the answer is right
  // before the first slot assignment and in every rendering environment.
  #syncSlots() {
    const named = (name) => this.querySelector(`:scope > [slot="${name}"]`) !== null;
    const unnamed = [...this.childNodes].some(
      (node) =>
        (node instanceof Element && !node.hasAttribute("slot")) ||
        (node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim() !== "")
    );
    this.#titleEl.classList.toggle("notice__title--empty", !named("title"));
    this.#messageEl.classList.toggle("notice__message--empty", !unnamed);
    this.#actionsEl.classList.toggle("notice__actions--empty", !named("actions"));
  }
}

customElements.define("neuwo-notice", NeuwoNotice);
