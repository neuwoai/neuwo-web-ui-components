import { NeuwoElement, define } from "../../core/element.js";
import { DEFAULT_LABEL, spinnerTemplate } from "./spinner.template.js";

/**
 * A loading ring: an indeterminate progress bar, sized by the surrounding text unless `size` says otherwise, and
 * coloured by it unless `variant` says otherwise. It turns, and under reduced motion it fades instead. Give the
 * region that is loading `aria-busy="true"` and an `aria-describedby` naming the spinner's `id`, with the spinner
 * outside it; a page that wants the load spoken uses a live region it already has, since one inserted together with
 * its text is not announced reliably. The element draws no box: place the ring through `.neuwo-spinner`.
 *
 * @summary Neuwo spinner. Public classes: `.neuwo-spinner` on the ring `<span>`, with its modifiers `.neuwo-spinner--m`, `--l`, `--blue` and `--green`. `<neuwo-button loading>` renders the same ring.
 * @customElement neuwo-spinner
 * @attr {m|l} size - ring diameter: unset follows the surrounding text (1em), m 1.5rem, l 2.5rem.
 * @attr {blue|green} variant - ring colour; unset follows the text colour.
 * @attr {string} label - what a screen reader hears; set it to the visitor's language. Unset, the element's own `aria-label` names the ring, and without one it is Loading. An empty value marks the ring decorative instead (aria-hidden, no role), for one beside visible text that already says what is loading.
 * @cssprop --neuwo-color-blue - the blue variant's colour; re-theme on :root.
 * @cssprop --neuwo-color-green - the green variant's colour; re-theme on :root.
 */
export class NeuwoSpinner extends NeuwoElement {
  static template = spinnerTemplate;
  static observedAttributes = ["size", "variant", "label"];

  get size() { return this.getAttribute("size") || ""; }
  set size(value) {
    if (value == null || value === "") this.removeAttribute("size");
    else this.setAttribute("size", String(value));
  }
  get variant() { return this.getAttribute("variant") || ""; }
  set variant(value) {
    if (value == null || value === "") this.removeAttribute("variant");
    else this.setAttribute("variant", String(value));
  }
  get label() { return this.getAttribute("label") ?? DEFAULT_LABEL; }
  set label(value) {
    // An empty label marks the ring decorative, so only null removes the attribute.
    if (value == null) this.removeAttribute("label");
    else this.setAttribute("label", String(value));
  }
}

define("neuwo-spinner", NeuwoSpinner);
