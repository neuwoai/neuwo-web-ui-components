import { childInfo } from "../../core/adapters/dom.js";
import { NeuwoElement, define, ownedByReact } from "../../core/element.js";
import { DEFAULT_REGION } from "../../core/template.js";
import { ctaTemplate } from "./cta.template.js";

/**
 * Call-to-action band: a headline, a supporting line, and one or two action
 * buttons on a branded surface. Two variants: `banner` (a flat horizontal bar
 * for page-foot CTAs) and `spotlight` (a centred hero card framed by an animated
 * gradient border that comes alive on hover). Wrap headline words in an element
 * with `data-accent` to paint just those words with the brand gradient. With the
 * `pulse` attribute, the first action button radiates a ring synced to the
 * surface shimmer, whatever its variant, and `intensity` scales that ring.
 * Presentational; the actions are `<neuwo-button>`s, and an optional `field`
 * region takes an inline control so a capture band needs no rebuild by hand.
 * Submission stays with the consumer: wrap the band in a `<form>` and a
 * `<neuwo-button type="submit">` among the actions drives it.
 *
 * @summary Neuwo call-to-action band. Public classes: `.neuwo-cta` on the band, with `--banner` or `--spotlight`; `.neuwo-cta__inner` inside it in both variants, after `.neuwo-cta__glow` in the spotlight, holding `.neuwo-cta__body` and then `.neuwo-cta__actions`; `.neuwo-cta__headline`, `.neuwo-cta__sub`, `.neuwo-cta__field` and `.neuwo-cta__actions` around the author's content, with `.neuwo-cta__field--empty` on a field wrapper nothing fills; `.neuwo-cta__status` on the status line, with `--success` or `--error`.
 * @customElement neuwo-cta
 * @attr {banner|spotlight} variant - layout and chrome (default banner).
 * @attr {boolean} pulse - radiate a synchronised pulse ring on the first action button, any variant; honours prefers-reduced-motion.
 * @attr {s|m|l} intensity - amplitude of the pulse ring (default m). No effect without `pulse`.
 * @attr {1|2|3|4|5|6} heading-level - heading level for the headline element (default 2).
 * @attr status - message shown under the field after the band's action; the consumer sets it, the component renders the line and its live region.
 * @attr {muted|success|error} status-state - colour of the status message (default muted).
 * @slot - the headline; wrap gradient fragments in an element with `data-accent`.
 * @slot sub - the supporting line under the headline.
 * @slot field - an inline field in the text column (an email capture); wrap the band in your own <form> and the control submits with it.
 * @slot actions - one or two action buttons.
 * @cssprop --neuwo-color-blue - brand accent (shimmer, pulse, gradient border); re-theme on :root.
 * @cssprop --neuwo-color-green - brand accent (gradient border + text accent); re-theme on :root.
 * @cssprop --neuwo-cta-field-width - cap on the field's width (default 24rem).
 */
export class NeuwoCta extends NeuwoElement {
  static template = ctaTemplate;
  static observedAttributes = ["variant", "pulse", "intensity", "heading-level", "status", "status-state"];

  // Upgraded in place, built by the parser or parsed with its children, so its content is complete when it starts.
  #authored = this.isConnected || this.ownerDocument.readyState === "loading" || this.hasChildNodes();

  /** @type {number | null} */
  #startedWith = null;

  get variant() { return this.getAttribute("variant") || "banner"; }
  set variant(value) {
    if (value == null || value === "") this.removeAttribute("variant");
    else this.setAttribute("variant", String(value));
  }

  get pulse() { return this.hasAttribute("pulse"); }
  set pulse(value) { this.toggleAttribute("pulse", Boolean(value)); }

  get intensity() { return this.getAttribute("intensity") || "m"; }
  set intensity(value) {
    if (value == null || value === "") this.removeAttribute("intensity");
    else this.setAttribute("intensity", String(value));
  }

  get headingLevel() { return this.getAttribute("heading-level") || "2"; }
  set headingLevel(value) {
    if (value == null || value === "") this.removeAttribute("heading-level");
    else this.setAttribute("heading-level", String(value));
  }

  get status() { return this.getAttribute("status") ?? ""; }
  set status(value) {
    if (value == null || value === "") this.removeAttribute("status");
    else this.setAttribute("status", String(value));
  }

  get statusState() { return this.getAttribute("status-state") || "muted"; }
  set statusState(value) {
    if (value == null || value === "" || value === "muted") this.removeAttribute("status-state");
    else this.setAttribute("status-state", String(value));
  }

  connect() {
    if (this.#authored || ownedByReact(this)) queueMicrotask(() => this.#validate());
    else this.#startedWith = childInfo(this, ctaTemplate).length;
  }

  updated() {
    if (this.#startedWith === null || childInfo(this, ctaTemplate).length <= this.#startedWith) return;
    this.#startedWith = null;
    queueMicrotask(() => this.#validate());
  }

  #validate() {
    if (!this.querySelector(":scope > .neuwo-cta")) return;
    const children = childInfo(this, ctaTemplate);
    if (!children.some((child) => child.slot === DEFAULT_REGION)) console.warn("<neuwo-cta>: expected headline content in the default slot.");
    if (!children.some((child) => child.slot === "actions" && child.tag !== null)) console.warn('<neuwo-cta>: expected at least one button in the "actions" slot.');
  }
}

define("neuwo-cta", NeuwoCta);
