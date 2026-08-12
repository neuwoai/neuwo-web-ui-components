import { NeuwoElement } from "../../core/base-element.js";
import { sheet } from "../../core/sheet.js";
import ctaCss from "./cta.css?raw";

// The spotlight border animates `--cta-angle` through a conic gradient. A
// `@property` rule inside an adopted (shadow) stylesheet does not register the
// custom property in every engine, so register it document-globally here. Without
// registration the angle cannot interpolate and the gradient never paints.
if (typeof CSS !== "undefined" && CSS.registerProperty) {
  try {
    CSS.registerProperty({ name: "--cta-angle", syntax: "<angle>", inherits: false, initialValue: "0deg" });
  } catch {
    // Already registered (e.g. the module evaluated twice); ignore.
  }
}

function el(tag, className, part) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (part) node.setAttribute("part", part);
  return node;
}

function slot(name) {
  const s = document.createElement("slot");
  if (name) s.setAttribute("name", name);
  return s;
}

/**
 * Call-to-action band: a headline, a supporting line, and one or two action
 * buttons on a branded surface. Two variants: `banner` (a flat horizontal bar
 * for page-foot CTAs) and `spotlight` (a centred hero card framed by an animated
 * gradient border that comes alive on hover). Wrap headline words in an element
 * with `data-accent` to paint just those words with the brand gradient. With the
 * `pulse` attribute, the first slotted action button radiates a ring synced to
 * the surface shimmer, whatever its variant, and `intensity` scales that ring.
 * Presentational; the actions are slotted `<neuwo-button>`s, and an optional
 * `field` slot takes an inline control so a capture band needs no rebuild by
 * hand. Submission stays with the consumer: wrap the band in a `<form>` and a
 * slotted `<neuwo-button type="submit">` drives it.
 *
 * @summary Neuwo call-to-action band.
 * @customElement neuwo-cta
 * @attr {banner|spotlight} variant - layout and chrome (default banner).
 * @attr {boolean} pulse - radiate a synchronised pulse ring on the first slotted action button, any variant; honours prefers-reduced-motion.
 * @attr {s|m|l} intensity - amplitude of the pulse ring (default m). No effect without `pulse`.
 * @attr {1|2|3|4|5|6} heading-level - heading level for the headline element (default 2).
 * @attr status - message shown under the field after the band's action; the consumer sets it, the component renders the line and its live region.
 * @attr {muted|success|error} status-state - colour of the status message (default muted).
 * @slot - the headline; wrap gradient fragments in an element with `data-accent`.
 * @slot sub - the supporting line under the headline.
 * @slot field - an inline field in the text column (an email capture); wrap the band in your own <form> and the slotted control submits with it.
 * @slot actions - one or two action buttons.
 * @csspart cta - the outer band.
 * @csspart inner - the inner panel (spotlight variant only).
 * @csspart headline - the headline element.
 * @csspart sub - the supporting line.
 * @csspart field - the wrapper around the slotted field.
 * @csspart status - the status message line.
 * @csspart actions - the actions row.
 * @cssprop --color-blue - brand accent (shimmer, pulse, gradient border); re-theme on :root.
 * @cssprop --color-green - brand accent (gradient border + text accent); re-theme on :root.
 * @cssprop --cta-field-width - cap on the slotted field's width (default 24rem).
 */
export class NeuwoCta extends NeuwoElement {
  static styles = sheet(ctaCss);
  static observedAttributes = ["variant", "heading-level", "status", "status-state"];

  get variant() { return this.getAttribute("variant") || "banner"; }
  set variant(value) {
    if (value == null || value === "") this.removeAttribute("variant");
    else this.setAttribute("variant", String(value));
  }
  // `pulse` and `intensity` are driven purely by `:host([...])` rules, so
  // neither needs a render pass or a place in observedAttributes.
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

  // What the current tree was built from, so a non-structural change patches.
  #builtWith = null;
  #fieldEl = null;
  #statusEl = null;

  connectedCallback() {
    super.connectedCallback(); // builds via render()
    // Light-DOM children may not be parsed yet at connect time; defer the
    // content check until they are.
    queueMicrotask(() => this.#validate());
  }

  #headingTag() {
    const n = parseInt(this.getAttribute("heading-level") ?? "", 10);
    return n >= 1 && n <= 6 ? `h${n}` : "h2";
  }

  render() {
    const variant = this.getAttribute("variant") === "spotlight" ? "spotlight" : "banner";
    const headingTag = this.#headingTag();
    // Both of these change the tree itself: a spotlight nests the card in a glow
    // and an inner panel, and the heading level is an element's tag name. Every
    // other attribute is patched, so writing one at runtime never rebuilds the
    // band under the visitor and restarts the shimmer.
    const structural =
      !this.#builtWith ||
      this.#builtWith.variant !== variant ||
      this.#builtWith.headingTag !== headingTag;
    if (structural) this.#build(variant, headingTag);
    this.#patch();
  }

  #build(variant, headingTag) {
    const spotlight = variant === "spotlight";
    const root = el("div", `cta cta--${variant}`, "cta");

    const headline = el(headingTag, "cta__headline", "headline");
    const headlineSlot = slot(); // default slot carries the headline content
    headline.append(headlineSlot);
    const sub = el("p", "cta__sub", "sub");
    sub.append(slot("sub"));
    const field = el("div", "cta__field", "field");
    const fieldSlot = slot("field");
    field.append(fieldSlot);
    this.#fieldEl = field;
    // Always in the DOM and never display:none. A live region that is injected,
    // or un-hidden with its text already in place, does not reliably announce;
    // one that is present and then written to does.
    const status = el("p", "cta__status", "status");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    this.#statusEl = status;
    const actions = el("div", "cta__actions", "actions");
    const actionsSlot = slot("actions");
    actions.append(actionsSlot);

    if (spotlight) {
      // card -> blurred glow halo + inner panel (the gradient-frame layering).
      const glow = el("div", "cta__glow");
      glow.setAttribute("aria-hidden", "true");
      const inner = el("div", "cta__inner", "inner");
      inner.append(headline, sub, field, status, actions);
      root.append(glow, inner);
    } else {
      const body = el("div", "cta__body");
      body.append(headline, sub, field, status);
      root.append(body, actions);
    }

    this.shadowRoot.replaceChildren(root);

    // Re-check when slotted content changes at runtime.
    headlineSlot.addEventListener("slotchange", () => this.#validate());
    actionsSlot.addEventListener("slotchange", () => this.#validate());
    fieldSlot.addEventListener("slotchange", () => this.#patch());

    this.#builtWith = { variant, headingTag };
  }

  #patch() {
    // Read the light DOM rather than assignedNodes(), so the answer is right
    // before the first slot assignment and in every rendering environment.
    const hasField = this.querySelector(':scope > [slot="field"]') !== null;
    this.#fieldEl.classList.toggle("cta__field--empty", !hasField);

    const status = this.getAttribute("status") ?? "";
    if (this.#statusEl.textContent !== status) this.#statusEl.textContent = status;
    // Only the two named states colour the line; anything else stays muted.
    const state = this.getAttribute("status-state");
    this.#statusEl.classList.toggle("cta__status--success", state === "success");
    this.#statusEl.classList.toggle("cta__status--error", state === "error");
  }

  // Dev-time guard: a CTA needs a headline and at least one action button.
  // Slotted content cannot be "required" like a form field, so warn instead of
  // failing. Reads the host's own light DOM, which is robust across environments.
  #validate() {
    const kids = [...this.childNodes];
    const hasHeadline = kids.some(
      (n) =>
        (n instanceof Element && !n.hasAttribute("slot")) ||
        (n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim() !== "")
    );
    const hasButton = kids.some(
      (n) => n instanceof Element && n.getAttribute("slot") === "actions"
    );
    if (!hasHeadline) console.warn("<neuwo-cta>: expected headline content in the default slot.");
    if (!hasButton) console.warn('<neuwo-cta>: expected at least one button in the "actions" slot.');
  }
}

customElements.define("neuwo-cta", NeuwoCta);
