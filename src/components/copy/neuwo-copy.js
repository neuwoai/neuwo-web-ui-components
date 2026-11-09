import { NeuwoElement } from "../../core/base-element.js";
import { sheet } from "../../core/sheet.js";
import copyCss from "./copy.css?raw";

// Long enough to read the tick, short enough that the control is ready again
// before a second copy.
const RESET_DELAY = 1200;

/**
 * Wraps copyable content and puts a copy control in its top-right corner. The
 * content stays in the light DOM, so a code panel keeps the styling and the
 * syntax colouring the page already gives it; only the control is encapsulated.
 * Copies `textContent`, so nothing has to name the source: wrap a `<pre>`, a
 * `<neuwo-deal-id>`, or any element whose text is worth pasting elsewhere.
 *
 * The control renders only where the clipboard is reachable. Without a secure
 * context there is no `navigator.clipboard`, so rather than offer a button that
 * cannot work, the element renders none.
 *
 * @summary Neuwo copy-to-clipboard wrapper.
 * @customElement neuwo-copy
 * @attr label - accessible name for the control (default "Copy"); set it to the visitor's language.
 * @attr copied-label - what a screen reader hears after a successful copy (default "Copied").
 * @attr failed-label - what a screen reader hears when the clipboard refuses (default "Copying failed").
 * @prop {string} text - read-only; the text the control writes, trimmed.
 * @slot - the content to copy.
 * @csspart button - the copy control.
 * @csspart status - the live region carrying the outcome.
 * @cssprop --neuwo-copy-inset - distance from the top and end edges (default `--neuwo-space-3`).
 * @fires {CustomEvent<{ text: string }>} copied - after the text reaches the clipboard; `detail.text` is what was written.
 */
export class NeuwoCopy extends NeuwoElement {
  static styles = sheet(copyCss);
  static observedAttributes = ["label", "copied-label", "failed-label"];

  #built = false;
  #button = null;
  #status = null;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  #resetTimer;

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

  /**
   * The text the control writes: the wrapped content's own text, trimmed. The
   * trim is what makes indented markup safe, since the newline and spaces
   * around a nested `<pre>` are the author's formatting, not the sample.
   */
  get text() { return (this.textContent ?? "").trim(); }

  /**
   * Copy the wrapped text the way the control does, then show the outcome.
   * Public so a consumer can drive it from their own trigger.
   * @returns {Promise<boolean>} whether the text reached the clipboard.
   */
  async copy() {
    const text = this.text;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      this.#report(false);
      return false;
    }
    this.#report(true);
    this.dispatchEvent(
      new CustomEvent("copied", { bubbles: true, composed: true, detail: { text } })
    );
    return true;
  }

  disconnectedCallback() {
    clearTimeout(this.#resetTimer);
  }

  // Built once and relabelled afterwards, so a label change cannot drop focus
  // from the control or interrupt the tick mid-confirmation.
  render() {
    if (!this.#built) this.#build();
    this.#button?.setAttribute("aria-label", this.label);
  }

  // No clipboard, no control: an insecure context leaves `navigator.clipboard`
  // undefined, and a button that silently fails is worse than no button. The
  // slot is appended either way, so the wrapped content is projected regardless.
  #buildable() {
    return typeof navigator !== "undefined" && typeof navigator.clipboard?.writeText === "function";
  }

  #build() {
    this.#built = true;
    // Content first, so reading and tab order follow the visual order.
    const children = [document.createElement("slot")];

    if (this.#buildable()) {
      this.#button = document.createElement("button");
      this.#button.type = "button";
      this.#button.className = "copy";
      this.#button.setAttribute("part", "button");
      this.#button.addEventListener("click", () => void this.copy());

      this.#status = document.createElement("span");
      this.#status.className = "copy__status";
      this.#status.setAttribute("part", "status");
      this.#status.setAttribute("role", "status");
      this.#status.setAttribute("aria-live", "polite");

      children.push(this.#button, this.#status);
    }

    this.shadowRoot.replaceChildren(...children);
  }

  // Nothing to show where no control was built, which is also the path a
  // programmatic `copy()` takes in an insecure context.
  #report(ok) {
    if (!this.#button) return;
    this.#button.classList.toggle("copy--done", ok);
    this.#status.textContent = ok ? this.copiedLabel : this.failedLabel;

    clearTimeout(this.#resetTimer);
    this.#resetTimer = setTimeout(() => {
      this.#button.classList.remove("copy--done");
      this.#status.textContent = "";
    }, RESET_DELAY);
  }
}

customElements.define("neuwo-copy", NeuwoCopy);
