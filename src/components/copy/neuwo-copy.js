import { NeuwoElement, define } from "../../core/element.js";
import { copyTemplate } from "./copy.template.js";

const RESET_DELAY = 1200;
const TEXT = 3;

/**
 * @param {Node} node
 * @returns {string}
 */
function readable(node) {
  if (node.nodeType === TEXT) return /** @type {Text} */ (node).data;
  if (node instanceof Element && node.matches(".neuwo-copy__status")) return "";
  return Array.from(node.childNodes, readable).join("");
}

/**
 * @param {string} text
 * @returns {Promise<boolean>}
 */
async function written(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Wraps copyable content and puts a copy control in its top-right corner. The
 * content stays as authored inside `.neuwo-copy__content`, so a code panel keeps
 * the styling and the syntax colouring the page already gives it. Copies that
 * wrapper's text, trimmed, so nothing has to name the source: wrap a `<pre>`, a
 * `<neuwo-deal-id>`, or any element whose text is worth pasting elsewhere.
 *
 * The control is always rendered, because the markup cannot know whether the
 * clipboard is reachable. Where it is not, as in an insecure context, a copy
 * announces the failed label.
 *
 * @summary Neuwo copy-to-clipboard wrapper. Public classes: `.neuwo-copy` on the root `<div>` (`display: contents`), `.neuwo-copy__content` around the wrapped content, `.neuwo-copy__button` on the control and `.neuwo-copy__status` on the visually hidden live region. For 1.2 s after a copy the host carries `data-neuwo-state="copied"`, or `"failed"` when the clipboard refused.
 * @customElement neuwo-copy
 * @attr label - accessible name for the control (default "Copy"); set it to the visitor's language. It wins over an `aria-label` or `aria-labelledby` on the element, which the control otherwise takes, with `title` and every other `aria-*`.
 * @attr copied-label - what a screen reader hears after a successful copy (default "Copied").
 * @attr failed-label - what a screen reader hears when the clipboard refuses or is unavailable, or there is no text to copy (default "Copying failed").
 * @prop {string} text - read-only; the text the control writes, trimmed.
 * @slot - the content to copy.
 * @slot status - reserved for the outcome the element announces; a child given this slot is read out with every announcement.
 * @cssprop --neuwo-copy-inset - distance from the top and end edges (default `--neuwo-space-3`).
 * @fires {CustomEvent<{ text: string }>} copied - after the text reaches the clipboard; `detail.text` is what was written.
 */
export class NeuwoCopy extends NeuwoElement {
  static template = copyTemplate;
  static observedAttributes = ["label", "copied-label", "failed-label"];

  /** @type {ReturnType<typeof setTimeout> | undefined} */
  #timer;

  /** @type {Text | null} */
  #announcement = null;

  get label() { return this.getAttribute("label") || "Copy"; }
  set label(value) {
    if (value == null || value === "") this.removeAttribute("label");
    else this.setAttribute("label", String(value));
  }

  get copiedLabel() { return this.getAttribute("copied-label") || "Copied"; }
  set copiedLabel(value) {
    if (value == null || value === "") this.removeAttribute("copied-label");
    else this.setAttribute("copied-label", String(value));
  }

  get failedLabel() { return this.getAttribute("failed-label") || "Copying failed"; }
  set failedLabel(value) {
    if (value == null || value === "") this.removeAttribute("failed-label");
    else this.setAttribute("failed-label", String(value));
  }

  get text() { return readable(this.#own("content") ?? this).trim(); }

  /**
   * Copy the wrapped text the way the control does, then announce the outcome.
   * Public so a consumer can drive it from their own trigger.
   * @returns {Promise<boolean>} whether the text reached the clipboard.
   */
  async copy() {
    const text = this.text;
    if (!text || !(await written(text))) {
      this.#show("failed");
      return false;
    }
    this.#show("copied");
    this.dispatchEvent(new CustomEvent("copied", { bubbles: true, composed: true, detail: { text } }));
    return true;
  }

  connect() {
    this.addEventListener("click", this.#click);
  }

  disconnect() {
    this.removeEventListener("click", this.#click);
    this.#reset();
  }

  /** @param {Event} event */
  #click = (event) => {
    const target = event.target instanceof Element ? event.target.closest(".neuwo-copy__button") : null;
    if (target && target === this.#own("button")) void this.copy();
  };

  /** @param {"content" | "button" | "status"} name */
  #own(name) {
    return this.querySelector(`:scope > .neuwo-copy > .neuwo-copy__${name}`);
  }

  /** @param {"copied" | "failed"} state */
  #show(state) {
    clearTimeout(this.#timer);
    this.setAttribute("data-neuwo-state", state);
    const announcement = (this.#announcement ??= this.ownerDocument.createTextNode(""));
    announcement.remove();
    announcement.data = state === "copied" ? this.copiedLabel : this.failedLabel;
    this.#own("status")?.append(announcement);
    this.#timer = setTimeout(() => this.#reset(), RESET_DELAY);
  }

  #reset() {
    clearTimeout(this.#timer);
    this.removeAttribute("data-neuwo-state");
    this.#announcement?.remove();
  }
}

define("neuwo-copy", NeuwoCopy);
