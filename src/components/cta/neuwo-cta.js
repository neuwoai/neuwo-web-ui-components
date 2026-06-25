import { NeuwoElement } from "../../core/base-element.js";
import { sheet } from "../../core/sheet.js";
import ctaCss from "./cta.css?raw";

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
 * `pulse` attribute, the primary (solid) action button radiates a ring synced to
 * the surface shimmer. Presentational; the actions are slotted `<neuwo-button>`s.
 *
 * @summary Neuwo call-to-action band.
 * @customElement neuwo-cta
 * @attr {banner|spotlight} variant - layout and chrome (default banner).
 * @attr {boolean} pulse - radiate a synchronised pulse ring on the primary (solid) button; honours prefers-reduced-motion.
 * @slot - the headline; wrap gradient fragments in an element with `data-accent`.
 * @slot sub - the supporting line under the headline.
 * @slot actions - one or two action buttons.
 * @csspart cta - the outer band.
 * @csspart inner - the inner panel (spotlight variant only).
 * @csspart headline - the headline element.
 * @csspart sub - the supporting line.
 * @csspart actions - the actions row.
 * @cssprop --color-blue - brand accent (shimmer, pulse, gradient border); re-theme on :root.
 * @cssprop --color-green - brand accent (gradient border + text accent); re-theme on :root.
 */
export class NeuwoCta extends NeuwoElement {
  static styles = sheet(ctaCss);
  static observedAttributes = ["variant"];

  get variant() { return this.getAttribute("variant") || "banner"; }
  set variant(value) {
    if (value == null || value === "") this.removeAttribute("variant");
    else this.setAttribute("variant", String(value));
  }
  // `pulse` is driven purely by the `:host([pulse])` rule, so it needs no render.
  get pulse() { return this.hasAttribute("pulse"); }
  set pulse(value) { this.toggleAttribute("pulse", Boolean(value)); }

  connectedCallback() {
    super.connectedCallback(); // builds via render()
    // Light-DOM children may not be parsed yet at connect time; defer the
    // content check until they are.
    queueMicrotask(() => this.#validate());
  }

  render() {
    const spotlight = this.getAttribute("variant") === "spotlight";
    const root = el("div", `cta cta--${spotlight ? "spotlight" : "banner"}`, "cta");

    const headline = el("h2", "cta__headline", "headline");
    const headlineSlot = slot(); // default slot carries the headline content
    headline.append(headlineSlot);
    const sub = el("p", "cta__sub", "sub");
    sub.append(slot("sub"));
    const actions = el("div", "cta__actions", "actions");
    const actionsSlot = slot("actions");
    actions.append(actionsSlot);

    if (spotlight) {
      // card -> blurred glow halo + inner panel (the gradient-frame layering).
      const glow = el("div", "cta__glow");
      glow.setAttribute("aria-hidden", "true");
      const inner = el("div", "cta__inner", "inner");
      inner.append(headline, sub, actions);
      root.append(glow, inner);
    } else {
      const body = el("div", "cta__body");
      body.append(headline, sub);
      root.append(body, actions);
    }

    this.shadowRoot.replaceChildren(root);

    // Re-check when slotted content changes at runtime.
    headlineSlot.addEventListener("slotchange", () => this.#validate());
    actionsSlot.addEventListener("slotchange", () => this.#validate());
  }

  // Dev-time guard: a CTA needs a headline and at least one action button.
  // Slotted content cannot be "required" like a form field, so warn instead of
  // failing. Reads the host's own light DOM, which is robust across environments.
  #validate() {
    const kids = [...this.childNodes];
    const hasHeadline = kids.some(
      (n) =>
        (n.nodeType === Node.ELEMENT_NODE && !n.hasAttribute("slot")) ||
        (n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim() !== "")
    );
    const hasButton = kids.some(
      (n) => n.nodeType === Node.ELEMENT_NODE && n.getAttribute("slot") === "actions"
    );
    if (!hasHeadline) console.warn("<neuwo-cta>: expected headline content in the default slot.");
    if (!hasButton) console.warn('<neuwo-cta>: expected at least one button in the "actions" slot.');
  }
}

customElements.define("neuwo-cta", NeuwoCta);
